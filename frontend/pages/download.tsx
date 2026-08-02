import Head from 'next/head';
import Link from 'next/link';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Head>
        <title>Download Adhyayan App</title>
      </Head>
      
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8 space-y-6">
        <div className="mx-auto bg-blue-100 text-blue-600 rounded-full w-20 h-20 flex items-center justify-center text-4xl mb-4">
          📱
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900">
          Adhyayan Mobile App
        </h1>
        
        <p className="text-gray-600">
          Experience the future of learning on the go. Get our beautifully designed Android app featuring the AI Tutor and interactive courses.
        </p>
        
        <a 
          href="/adhyayan.apk" 
          download="Adhyayan.apk"
          className="block w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg"
        >
          Download APK Now
        </a>
        
        <p className="mt-8 text-center text-sm text-muted-text">
          *Requires Android 13.0 or higher.
        </p>
        
        <div className="pt-6 border-t border-gray-100">
          <Link href="/">
            <span className="text-blue-600 hover:underline cursor-pointer">Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
