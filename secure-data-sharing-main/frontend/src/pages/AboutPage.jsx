import Navbar from "../components/Navbar";

function AboutPage() {
  return (
    <div>
      <Navbar />
      <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 text-white text-center px-6">
        <h1 className="text-5xl font-bold mb-6">About Mirai</h1>
        <p className="max-w-3xl text-lg">
          Mirai is a next-generation secure file management platform.
          Our mission is to provide seamless and secure file storage,
          encryption, and sharing across all file types — from documents to images.
        </p>
      </section>
    </div>
  );
}

export default AboutPage;
