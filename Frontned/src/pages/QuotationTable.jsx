import { useState, useMemo, useEffect } from "react";
import "../css/QuotationTable.css";

const QuotationTable = ({
  onTotalChange,
  subtitle = "BLUESTAR PACKAGE Air Conditioner Project R 410 GAS",
  onSubtitleChange,
  summary,
  onSummaryChange,
  exportMode = false,
}) => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    particular: "",
    acTr: "",
    qty: "",
    rate: "",
  });
  const [gstPercent, setGstPercent] = useState(28);

  const handleChange = (e) =>
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));

  const handleAdd = (event) => {
    event.preventDefault();
    const particular = form.particular.trim();
    const acTr = Number(form.acTr);
    const qty = Number(form.qty);
    const rate = Number(form.rate);
    if (!particular || !form.acTr || !form.qty || !form.rate) {
      alert("Please fill all fields");
      return;
    }
    if (![acTr, qty, rate].every(Number.isFinite) || acTr < 0 || qty < 0 || rate < 0) {
      alert("AC TR, quantity, and rate must be valid non-negative numbers.");
      return;
    }
    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        particular,
        acTr,
        qty,
        rate,
      },
    ]);
    setForm({ particular: "", acTr: "", qty: "", rate: "" });
  };

  const handleDelete = (id) =>
    setItems((current) => current.filter((item) => item.id !== id));

  const calculated = useMemo(() => {
    const rows = items.map((item) => ({
      ...item,
      total: item.qty * item.rate,
    }));
    const totalTr = rows.reduce((s, r) => s + r.acTr * r.qty, 0);
    const subtotal = rows.reduce((s, r) => s + r.total, 0);
    const gst = subtotal * (Number(gstPercent) / 100 || 0);
    const grandTotal = subtotal + gst;
    return { rows, totalTr, subtotal, gst, grandTotal };
  }, [items, gstPercent]);

  useEffect(() => {
    if (onTotalChange) onTotalChange(calculated.grandTotal);
  }, [calculated.grandTotal, onTotalChange]);

  const format = (n) =>
    Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  return (
    <div className="quote-wrapper">
      <div className="quote-header">Annexure A -1</div>
      <div className="quote-subheader">
        {exportMode ? (
          subtitle
        ) : (
          <input
            aria-label="Annexure A-1 subtitle"
            className="quote-subheader-input"
            type="text"
            value={subtitle}
            onChange={(event) => onSubtitleChange(event.target.value)}
          />
        )}
      </div>

      {/* ⬇️ FORM — hidden when exporting to PDF */}
      {!exportMode && (
        <form className="quote-form quote-form-a1" onSubmit={handleAdd}>
          <input
            name="particular"
            aria-label="Equipment description"
            required
            placeholder="Particular (Equipment description)"
            value={form.particular}
            onChange={handleChange}
            className="form-input form-particular"
          />
          <input
            name="acTr"
            type="number"
            aria-label="AC TR"
            min="0"
            step="0.1"
            placeholder="AC TR"
            value={form.acTr}
            onChange={handleChange}
            className="form-input"
          />
          <input
            name="qty"
            type="number"
            aria-label="Quantity"
            min="0"
            step="any"
            placeholder="Qty"
            value={form.qty}
            onChange={handleChange}
            className="form-input"
          />
          <input
            name="rate"
            type="number"
            aria-label="Rate"
            min="0"
            step="any"
            placeholder="Rate"
            value={form.rate}
            onChange={handleChange}
            className="form-input"
          />
          <button type="submit" className="btn-add">+ Add</button>
          <label className="gst-label">
            GST %
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              aria-label="GST percentage"
              value={gstPercent}
              onChange={(e) => setGstPercent(e.target.value)}
              className="gst-input"
            />
          </label>
          <input
            type="text"
            aria-label="Annexure A-1 summary description"
            placeholder="Description shown in Annexure A-4"
            value={summary}
            onChange={(e) => onSummaryChange(e.target.value)}
            className="form-input summary-input"
          />
        </form>
      )}

      {/* TABLE — always visible (this is what goes in the PDF) */}
      <table className="quote-table">
        <thead>
          <tr>
            <th className="col-sr">Sr No.</th>
            <th className="col-particular">Particular</th>
            <th className="col-tr">AC TR</th>
            <th className="col-qty">Qty.</th>
            <th className="col-rate">Rate</th>
            <th className="col-total">Total</th>
            {!exportMode && <th className="col-action">Action</th>}
          </tr>
        </thead>
        <tbody>
          {calculated.rows.length === 0 ? (
            <tr>
              <td colSpan={exportMode ? 6 : 7} className="empty-row">
                {exportMode ? "No line items have been added." : <>No items yet. Fill the form above and click <b>+ Add</b>.</>}
              </td>
            </tr>
          ) : (
            calculated.rows.map((row, index) => (
              <tr key={row.id}>
                <td className="col-sr">{index + 1}</td>
                <td className="col-particular">{row.particular}</td>
                <td className="col-tr">{row.acTr} TR</td>
                <td className="col-qty">{row.qty}</td>
                <td className="col-rate">{format(row.rate)}</td>
                <td className="col-total">{format(row.total)}</td>
                {!exportMode && (
                  <td className="col-action">
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="btn-del"
                      title="Delete row"
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}

          <tr className="row-subtotal">
            <td colSpan="2"></td>
            <td className="col-tr">
              {calculated.totalTr % 1 === 0
                ? calculated.totalTr
                : calculated.totalTr.toFixed(1)}{" "}
              TR
            </td>
            <td colSpan="2" className="text-right">TOTAL</td>
            <td className="col-total">{format(calculated.subtotal)}</td>
            {!exportMode && <td></td>}
          </tr>

          <tr className="row-gst">
            <td colSpan="5" className="text-right">
              + GST {gstPercent}%
            </td>
            <td className="col-total">{format(calculated.gst)}</td>
            {!exportMode && <td></td>}
          </tr>

          <tr className="row-grand">
            <td colSpan="5" className="text-right">
              AC Side Grand Total
            </td>
            <td className="col-total">{format(calculated.grandTotal)}</td>
            {!exportMode && <td></td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default QuotationTable;