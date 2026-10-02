import { useMemo } from "react";
import "../css/QuotationTableA4.css";

const QuotationTableA4 = ({
  totals = { a1: 0, a2: 0, a3: 0 },
  summaries,
  subtitle = "Grand Total of Annexure A-1 to A-3",
  onSubtitleChange,
  exportMode = false,
}) => {
  const items = useMemo(
    () => [
      {
        annexure: "A - 1",
        particular: summaries.a1,
        total: totals.a1 || 0,
      },
      {
        annexure: "A - 2",
        particular: summaries.a2,
        total: totals.a2 || 0,
      },
      {
        annexure: "A - 3",
        particular: summaries.a3,
        total: totals.a3 || 0,
      },
    ],
    [summaries, totals]
  );

  const grandTotal = useMemo(
    () => items.reduce((s, r) => s + (Number(r.total) || 0), 0),
    [items]
  );

  const format = (n) =>
    Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  return (
    <div className="quote-wrapper">
      <div className="quote-header">Annexure A- 4</div>
      <div className="quote-subheader">
        {exportMode ? (
          subtitle
        ) : (
          <input
            aria-label="Annexure A-4 subtitle"
            className="quote-subheader-input"
            type="text"
            value={subtitle}
            onChange={(event) => onSubtitleChange(event.target.value)}
          />
        )}
      </div>

      <table className="quote-table">
        <thead>
          <tr>
            <th className="col-annexure">Annexure</th>
            <th className="col-particular">Particular</th>
            <th className="col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.annexure}>
              <td className="col-annexure">{row.annexure}</td>
              <td className="col-particular">
                {String(row.particular || "").split("\n").map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </td>
              <td className="col-total">{format(row.total)}</td>
            </tr>
          ))}
          <tr className="row-grand">
            <td colSpan="2" className="text-right">
              Approximate Total Project Cost
            </td>
            <td className="col-total">{format(grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default QuotationTableA4;