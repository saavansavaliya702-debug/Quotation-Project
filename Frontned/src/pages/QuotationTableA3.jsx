import { useState, useMemo, useEffect } from "react";
import "../css/QuotationTableA3.css";

const UNITS = [
  "SQFT", "SQ.FT", "SQM", "FEET", "FOOT", "METER",
  "PCS", "NOS", "SET", "LOT", "KG", "TON", "APPROX",
];

const QuotationTableA3 = ({
  onTotalChange,
  subtitle = "AC DUCTING WORK",
  onSubtitleChange,
  summary,
  onSummaryChange,
  exportMode = false,
}) => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    particular: "",
    qty: "",
    unit: "SQFT",
    rate: "",
  });

  const handleChange = (e) =>
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));

  const handleAdd = (event) => {
    event.preventDefault();
    const particular = form.particular.trim();
    const qtyNum = Number(form.qty);
    const rateNum = Number(form.rate);
    if (!particular || !form.qty || !form.rate) {
      alert("Please fill all fields");
      return;
    }
    if (![qtyNum, rateNum].every(Number.isFinite) || qtyNum < 0 || rateNum < 0) {
      alert("Quantity and rate must be valid non-negative numbers.");
      return;
    }
    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        particular,
        qty: qtyNum,
        unit: form.unit,
        rate: rateNum,
      },
    ]);
    setForm({ particular: "", qty: "", unit: "SQFT", rate: "" });
  };

  const handleDelete = (id) =>
    setItems((current) => current.filter((item) => item.id !== id));

  const calculated = useMemo(() => {
    const rows = items.map((item) => ({
      ...item,
      total: item.qty * item.rate,
    }));
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);
    return { rows, grandTotal };
  }, [items]);

  useEffect(() => {
    if (onTotalChange) onTotalChange(calculated.grandTotal);
  }, [calculated.grandTotal, onTotalChange]);

  const format = (n) =>
    Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  return (
    <div className="quote-wrapper">
      <div className="quote-header">Annexure A-3</div>
      <div className="quote-subheader">
        {exportMode ? (
          subtitle
        ) : (
          <input
            aria-label="Annexure A-3 subtitle"
            className="quote-subheader-input"
            type="text"
            value={subtitle}
            onChange={(event) => onSubtitleChange(event.target.value)}
          />
        )}
      </div>

      {!exportMode && (
        <form className="quote-form quote-form-units" onSubmit={handleAdd}>
          <textarea
            name="particular"
            aria-label="Particular description"
            required
            placeholder="Particular (multi-line description allowed)"
            value={form.particular}
            onChange={handleChange}
            rows={3}
            className="form-input form-particular"
          />
          <div className="qty-group">
            <input
              name="qty"
              type="number"
              aria-label="Quantity"
              min="0"
              step="0.01"
              placeholder="Qty"
              value={form.qty}
              onChange={handleChange}
              className="form-input form-qty"
            />
            <select
              name="unit"
              aria-label="Unit"
              value={form.unit}
              onChange={handleChange}
              className="form-input form-unit"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
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
          <input
            type="text"
            aria-label="Annexure A-3 summary description"
            placeholder="Description shown in Annexure A-4"
            value={summary}
            onChange={(e) => onSummaryChange(e.target.value)}
            className="form-input summary-input"
          />
        </form>
      )}

      <table className="quote-table">
        <thead>
          <tr>
            <th className="col-sr">Sr.No</th>
            <th className="col-particular">Particular</th>
            <th className="col-qty">Qty.</th>
            <th className="col-rate">Rate</th>
            <th className="col-total">Total</th>
            {!exportMode && <th className="col-action">Action</th>}
          </tr>
        </thead>
        <tbody>
          {calculated.rows.length === 0 ? (
            <tr>
              <td colSpan={exportMode ? 5 : 6} className="empty-row">
                {exportMode ? "No line items have been added." : <>No items yet. Fill the form above and click <b>+ Add</b>.</>}
              </td>
            </tr>
          ) : (
            calculated.rows.map((row, index) => (
              <tr key={row.id}>
                <td className="col-sr">{index + 1}</td>
                <td className="col-particular">
                  {row.particular.split("\n").map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </td>
                <td className="col-qty">{row.qty} {row.unit.toUpperCase()}</td>
                <td className="col-rate">{format(row.rate)}</td>
                <td className="col-total">{format(row.total)}</td>
                {!exportMode && (
                  <td className="col-action">
                    <button
                      className="btn-del"
                      onClick={() => handleDelete(row.id)}
                      title="Delete row"
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}

          <tr className="row-grand">
            <td colSpan="4" className="text-right">AC Side Grand Total</td>
            <td className="col-total">{format(calculated.grandTotal)}</td>
            {!exportMode && <td></td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default QuotationTableA3;