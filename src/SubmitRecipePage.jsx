import Navbar from "./Navbar";
import Footer from "./Footer";
import SubmitRecipeForm from "./SubmitRecipeForm";

export default function SubmitRecipePage() {
  return (
    <div className="min-h-screen flex flex-col bg-orange-50 text-gray-900">
      <Navbar />
      <main className="flex-grow max-w-3xl mx-auto p-6">
        <SubmitRecipeForm />
      </main>
      <Footer />
    </div>
  );
}