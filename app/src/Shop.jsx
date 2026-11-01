import { Item, Uncle } from './Pixel.jsx'

// The shop scene: wall, shelf with four items, the uncle (none when the shop is closed) and the counter.
// It stays in the same place in the tree across steps, so moving on does not rebuild it.
export default function Shop({ face, night, big, children }) {
  return (
    <div className={`scene${big ? ' tall' : ''}${night ? ' night' : ''}`} data-testid="shop-scene" data-scene={night ? 'night' : 'day'}>
      <div className="items">
        <Item item="vase" />
        <Item item="clock" />
        <span className="gap" />
        <Item item="bear" />
        <Item item="lamp" />
      </div>
      <div className="shelf" />
      {children}
      {night && <div className="closed" data-testid="closed-sign" aria-hidden="true">오늘 영업 끝</div>}
      {face && (
        <div className="uncle-slot">
          <Uncle face={face} />
        </div>
      )}
      <div className="counter" data-testid="shop-counter" />
    </div>
  )
}
