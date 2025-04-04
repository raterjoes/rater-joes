import { useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import emailjs from "emailjs-com";

export default function Contact() {
  const [formData, setFormData] = useState({
    from_name: "",
    from_email: "",
    message: "",
  });
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const sendEmail = async (e) => {
    e.preventDefault();

    try {
      await emailjs.send(
        "service_o8x38r8",
        "template_5wtlrhp",
        formData,
        "3QC0yQNnVZWurgB7h"
      );

      setSuccess(true);
      setFormData({ from_name: "", from_email: "", message: "" });

      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to send email:", err);
      alert("Something went wrong. Try again later.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-2xl mx-auto px-6 py-12 text-gray-800">
        <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
        <p className="text-lg mb-6">
          Have a question, suggestion, or just want to say hi? We'd love to hear from you!
        </p>

        <form onSubmit={sendEmail} className="bg-white border rounded shadow p-6 space-y-4">
          <input
            type="text"
            name="from_name"
            placeholder="Your Name"
            value={formData.from_name}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="email"
            name="from_email"
            placeholder="Your Email"
            value={formData.from_email}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
          <textarea
            name="message"
            rows="5"
            placeholder="Your Message"
            value={formData.message}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          ></textarea>

          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Send Message
          </button>

          {success && (
            <p className="text-green-700 bg-green-100 p-2 rounded text-sm mt-2">
              ✅ Message sent successfully!
            </p>
          )}
        </form>
      </main>

      <Footer />
    </div>
  );
}