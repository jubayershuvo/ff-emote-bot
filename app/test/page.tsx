import VideoPlayer from "@/components/hilltopads/VastPlayer";

export default function Page() {
  return (
       <div className="max-w-3xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Video.js + VAST Example</h1>
      <VideoPlayer src="/video.mp4" />
    </div>
  );
}