import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Contact() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-2xl mx-auto px-6 py-12 text-gray-800">
        <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
        <p className="text-lg mb-6">
          Have a question, suggestion, or just want to say hi? We'd love to hear from you!
        </p>

        <div className="bg-white border rounded shadow p-6">
          <h2 className="text-xl font-semibold mb-2">📧 Email</h2>
          <p className="text-blue-600 underline">
            <a href="mailto:raterjoes.contact@gmail.com">
              raterjoes.contact@gmail.com
            </a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
