import { useState } from "react";
import "../css/Products.css";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", quantity: "", price: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = () => {
    if (!form.name || !form.quantity || !form.price) return;
    setProducts([
      ...products,
      {
        id: Date.now(),
        name: form.name,
        quantity: Number(form.quantity),
        price: Number(form.price),
      },
    ]);
    setForm({ name: "", quantity: "", price: "" });
  };

  const handleDelete = (id) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  return (
    <div className="products-container">
      <h2 className="products-title">Products</h2>

      {/* Form */}
      <div className="product-form">
        <input
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
        />
        <input
          name="quantity"
          placeholder="Quantity"
          type="number"
          value={form.quantity}
          onChange={handleChange}
        />
        <input
          name="price"
          placeholder="Price"
          type="number"
          value={form.price}
          onChange={handleChange}
        />
        <button onClick={handleAdd}>Add</button>
      </div>

      {/* Table */}
      <table className="product-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan="5" className="empty-row">
                No products yet. Add one above!
              </td>
            </tr>
          ) : (
            products.map((p, i) => (
              <tr key={p.id}>
                <td>{i + 1}</td>
                <td>{p.name}</td>
                <td>{p.quantity}</td>
                <td>₹{p.price}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(p.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Products;