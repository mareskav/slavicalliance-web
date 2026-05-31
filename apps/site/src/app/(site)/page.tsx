import { getLandingData } from "@/lib/landing"
import { LandingStory } from "./LandingStory"
import { TeamTimeline } from "./TeamTimeline"

const Home = async () => {
  const { page: landing, timelineEvents, source } = await getLandingData()

  return (
    <div className="space-y-16 font-sans">
      <LandingStory initialContent={landing.content} contentSource={source} />
      <TeamTimeline events={timelineEvents} contentSource={source} />
    </div>
  )
}

export default Home
