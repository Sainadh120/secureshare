import Navbar from "../components/Navbar";

function ContactPage() {
  return (
    <div>
      <Navbar />
      <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white text-center px-6">
        <h1 className="text-5xl font-bold mb-6">Contact Us</h1>
        <p className="max-w-2xl text-lg mb-4">
          Got questions or feedback? We'd love to hear from you.  
          Reach out anytime and our team will respond as soon as possible.
        </p>
        <a
          href="mailto:support@mirai.com"
          className="bg-white text-pink-600 font-semibold px-6 py-3 rounded-lg shadow-lg hover:bg-gray-200"
        >
          Email Us
        </a>
      </section>
    </div>
  );
}

export default ContactPage;
