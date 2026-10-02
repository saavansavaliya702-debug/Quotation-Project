import { useCallback, useRef, useState } from "react";
import QuotationTable from "./pages/QuotationTable";
import QuotationTableA2 from "./pages/QuotationTableA2";
import QuotationTableA3 from "./pages/QuotationTableA3";
import QuotationTableA4 from "./pages/QuotationTableA4";
import { downloadElementsAsPdf } from "./utils/downloadPdf";
import "./App.css";

const App = () => {
  const pagesRef = useRef(null);
  const nextAdditionalAnnexureId = useRef(1);
  const [totals, setTotals] = useState({ a1: 0, a2: 0, a3: 0 });
  const [additionalAnnexures, setAdditionalAnnexures] = useState([]);
  const [summaries, setSummaries] = useState({
    a1: "BLUESTAR PACKAGE Air Conditioner Project 11 + 16.5 TR ( Double Circuit ) R- 410 GAS",
    a2: "27.5 TR AC LOW Side work",
    a3: "27.5 TR AC Ducting work",
  });
  const [subtitles, setSubtitles] = useState({
    a1: "( BLUESTAR PACKAGE Air Conditioner Project R 410 GAS )",
    a2: "BLUESTAR Air Conditioner, Project 27.5 TR LOW SIDE WORK",
    a3: "(AC DUCTING WORK)",
    a4: "(Grand Total of Annexure A-1 to A-3 )",
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [companyLogo, setCompanyLogo] = useState(null);
  const [logoError, setLogoError] = useState("");

  const handleCompanyLogoChange = async (event) => {
    const [file] = event.target.files || [];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLogoError("Choose an image file for the company logo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError("The company logo must be 5 MB or smaller.");
      return;
    }

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("The selected logo could not be read."));
        };
        reader.onerror = () => reject(new Error("The selected logo could not be read."));
        reader.readAsDataURL(file);
      });
      const normalizedLogo = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("The selected logo could not be processed."));
            return;
          }
          context.drawImage(image, 0, 0);
          resolve({
            dataUrl: canvas.toDataURL("image/png"),
            width: image.naturalWidth,
            height: image.naturalHeight,
          });
        };
        image.onerror = () => reject(new Error("The selected logo is not a valid image."));
        image.src = dataUrl;
      });
      setCompanyLogo({
        ...normalizedLogo,
        format: "PNG",
        name: file.name,
      });
      setLogoError("");
    } catch (error) {
      console.error("Unable to load company logo:", error);
      setLogoError(error.message || "Unable to load the selected company logo.");
    }
  };

  const updateA1Total = useCallback(
    (a1) => setTotals((current) => ({ ...current, a1 })),
    [],
  );
  const updateA2Total = useCallback(
    (a2) => setTotals((current) => ({ ...current, a2 })),
    [],
  );
  const updateA3Total = useCallback(
    (a3) => setTotals((current) => ({ ...current, a3 })),
    [],
  );
  const updateAdditionalAnnexure = useCallback(
    (id, field, value) =>
      setAdditionalAnnexures((current) => {
        const existing = current.find((annexure) => annexure.id === id);
        if (!existing || existing[field] === value) return current;
        return current.map((annexure) =>
          annexure.id === id ? { ...annexure, [field]: value } : annexure,
        );
      }),
    [],
  );
  const handleAddAnnexure = () => {
    const currentAdditionalAnnexureCount = additionalAnnexures.length;
    const id = nextAdditionalAnnexureId.current;
    nextAdditionalAnnexureId.current += 1;
    setAdditionalAnnexures((current) => [
      ...current,
      {
        id,
        total: 0,
        summary: "Additional work",
        subtitle: "Additional work",
      },
    ]);
    setSubtitles((current) => {
      const previousDefault = `(Grand Total of Annexure A-1 to A-${currentAdditionalAnnexureCount + 3} )`;
      const nextDefault = `(Grand Total of Annexure A-1 to A-${currentAdditionalAnnexureCount + 4} )`;
      return current.a4 === previousDefault
        ? { ...current, a4: nextDefault }
        : current;
    });
  };
  const handleRemoveAnnexure = () => {
    if (additionalAnnexures.length === 0) return;

    const currentAdditionalAnnexureCount = additionalAnnexures.length;
    setAdditionalAnnexures((current) => current.slice(0, -1));
    setSubtitles((current) => {
      const previousDefault = `(Grand Total of Annexure A-1 to A-${currentAdditionalAnnexureCount + 3} )`;
      const nextDefault = `(Grand Total of Annexure A-1 to A-${currentAdditionalAnnexureCount + 2} )`;
      return current.a4 === previousDefault
        ? { ...current, a4: nextDefault }
        : current;
    });
  };
  const updateA1Summary = useCallback(
    (a1) => setSummaries((current) => ({ ...current, a1 })),
    [],
  );
  const updateA2Summary = useCallback(
    (a2) => setSummaries((current) => ({ ...current, a2 })),
    [],
  );
  const updateA3Summary = useCallback(
    (a3) => setSummaries((current) => ({ ...current, a3 })),
    [],
  );
  const updateA1Subtitle = useCallback(
    (a1) => setSubtitles((current) => ({ ...current, a1 })),
    [],
  );
  const updateA2Subtitle = useCallback(
    (a2) => setSubtitles((current) => ({ ...current, a2 })),
    [],
  );
  const updateA3Subtitle = useCallback(
    (a3) => setSubtitles((current) => ({ ...current, a3 })),
    [],
  );
  const updateA4Subtitle = useCallback(
    (a4) => setSubtitles((current) => ({ ...current, a4 })),
    [],
  );

  const handleExport = async () => {
    const pages = pagesRef.current?.querySelectorAll(".pdf-page");
    if (!pages?.length) {
      setExportError("The quotation pages could not be found. Please reload and try again.");
      return;
    }

    setIsExporting(true);
    setExportError("");
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await downloadElementsAsPdf(
        Array.from(pages),
        "ASHISH BHAI DHAMI BLUESTAR 27.5 TR.pdf",
        { companyLogo },
      );
    } catch (error) {
      console.error("Unable to export quotation PDF:", error);
      setExportError("PDF export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="pdf-toolbar">
        <div className="toolbar-title">
          <span className="toolbar-eyebrow">Quotation workspace</span>
          <h1>Project quotation</h1>
          <p>Prepare annexures, review your tables, and export a polished PDF.</p>
        </div>
        <div className="pdf-toolbar-actions">
          <label className="company-logo-upload">
            <span className="company-logo-label">Company logo <small>Optional · any image</small></span>
            <input
              type="file"
              accept="image/*"
              aria-label="Select company logo"
              onChange={handleCompanyLogoChange}
              disabled={isExporting}
            />
          </label>
          {companyLogo && (
            <div className="company-logo-selection">
              <img src={companyLogo.dataUrl} alt="Selected company logo preview" />
              <span title={companyLogo.name}>{companyLogo.name}</span>
              <button
                type="button"
                onClick={() => setCompanyLogo(null)}
                disabled={isExporting}
                aria-label="Remove selected company logo"
              >
                Remove
              </button>
            </div>
          )}
          <button
            className="btn-add-annexure"
            type="button"
            onClick={handleAddAnnexure}
            disabled={isExporting}
          >
            + Add annexure table
          </button>
          <button
            className="btn-remove-annexure"
            type="button"
            onClick={handleRemoveAnnexure}
            disabled={isExporting || additionalAnnexures.length === 0}
          >
            − Remove annexure table
          </button>
          <button
            className="btn-pdf-main"
            type="button"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? "Preparing PDF..." : "Export quotation PDF"}
          </button>
        </div>
      </header>
      {exportError && <p className="pdf-error" role="alert">{exportError}</p>}
      {logoError && <p className="pdf-error" role="alert">{logoError}</p>}

      <div className="pdf-pages" ref={pagesRef}>
        <section
          className={`pdf-page${isExporting ? " is-exporting" : ""}`}
          aria-label="Annexure A-1"
        >
          <QuotationTable
            onTotalChange={updateA1Total}
            subtitle={subtitles.a1}
            onSubtitleChange={updateA1Subtitle}
            summary={summaries.a1}
            onSummaryChange={updateA1Summary}
            exportMode={isExporting}
          />
        </section>
        <section
          className={`pdf-page${isExporting ? " is-exporting" : ""}`}
          aria-label="Annexure A-2"
        >
          <QuotationTableA2
            onTotalChange={updateA2Total}
            subtitle={subtitles.a2}
            onSubtitleChange={updateA2Subtitle}
            summary={summaries.a2}
            onSummaryChange={updateA2Summary}
            exportMode={isExporting}
          />
        </section>
        <section
          className={`pdf-page${isExporting ? " is-exporting" : ""}`}
          aria-label="Annexure A-3"
        >
          <QuotationTableA3
            onTotalChange={updateA3Total}
            subtitle={subtitles.a3}
            onSubtitleChange={updateA3Subtitle}
            summary={summaries.a3}
            onSummaryChange={updateA3Summary}
            exportMode={isExporting}
          />
        </section>
        {additionalAnnexures.map((annexure, index) => {
          const annexureNumber = index + 4;
          return (
            <section
              className={`pdf-page${isExporting ? " is-exporting" : ""}`}
              aria-label={`Annexure A-${annexureNumber}`}
              key={annexure.id}
            >
              <QuotationTableA2
                annexureNumber={annexureNumber}
                onTotalChange={(total) =>
                  updateAdditionalAnnexure(annexure.id, "total", total)
                }
                subtitle={annexure.subtitle}
                onSubtitleChange={(subtitle) =>
                  updateAdditionalAnnexure(annexure.id, "subtitle", subtitle)
                }
                summary={annexure.summary}
                onSummaryChange={(summary) =>
                  updateAdditionalAnnexure(annexure.id, "summary", summary)
                }
                exportMode={isExporting}
              />
            </section>
          );
        })}
        <section
          className={`pdf-page${isExporting ? " is-exporting" : ""}`}
          aria-label={`Annexure A-${additionalAnnexures.length + 4}`}
        >
          <QuotationTableA4
            totals={totals}
            summaries={summaries}
            additionalAnnexures={additionalAnnexures}
            subtitle={subtitles.a4}
            onSubtitleChange={updateA4Subtitle}
            exportMode={isExporting}
          />
        </section>
      </div>
    </main>
  );
};

export default App;
