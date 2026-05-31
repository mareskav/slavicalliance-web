import { getLandingPage, getTimelineEvents } from "@/lib/landing"
import { LandingStory } from "./LandingStory"
import { TeamTimeline } from "./TeamTimeline"

const Home = async () => {
  const landing = await getLandingPage()
  const timelineEvents = await getTimelineEvents()

  return (
    <div className="space-y-16 font-sans">
      <LandingStory initialContent={landing.content} />
      <TeamTimeline events={timelineEvents} />
    </div>
  )
}

export default Home
