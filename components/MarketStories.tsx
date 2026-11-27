/**
 * The Market Insights stories, in page order. A story whose builder has too little
 * data to say something is skipped, and the stories that remain are numbered in
 * order. Server-only (Keeps reads provenance).
 */
import { choiceHeadline, costPerMileHeadline, priceHeadline, rangeHeadline, thirdRowData, usedHeadline } from '@/lib/data-stories'
import { ChoiceStory, PriceStory, RangeStory, ThirdRowStory, UsedStory, ValueStory, type StoryNumber } from './DataStories'
import KeepsStory, { liveKeepsData } from './KeepsStory'

const STORIES: { key: string; shown: () => boolean; Component: (p: StoryNumber) => React.ReactNode }[] = [
  { key: 'choice', shown: () => choiceHeadline() !== null, Component: ChoiceStory },
  { key: 'price', shown: () => priceHeadline() !== null, Component: PriceStory },
  { key: 'range', shown: () => rangeHeadline() !== null, Component: RangeStory },
  { key: 'value', shown: () => costPerMileHeadline() !== null, Component: ValueStory },
  { key: 'used', shown: () => usedHeadline() !== null, Component: UsedStory },
  { key: 'keeps', shown: () => liveKeepsData() !== null, Component: KeepsStory },
  { key: 'third-row', shown: () => thirdRowData() !== null, Component: ThirdRowStory },
]

/** The stories that render with today's data, in page order. */
export const shownStories = () => STORIES.filter((s) => s.shown())

export default function MarketStories() {
  return (
    <>
      {shownStories().map(({ key, Component }, i) => (
        <Component key={key} n={i + 1} />
      ))}
    </>
  )
}
