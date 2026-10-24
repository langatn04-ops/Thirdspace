// Sample Dublin content, shown until the database has real posts.
const ago = (min) => new Date(Date.now() - min * 60000).toISOString()

const venues = [
  { id: 's1', tags: ['live music', 'gigs', 'nightlife'], name: 'Whelan’s', address: 'Camden Street', category: 'music', lat: 53.3366, lng: -6.2654 },
  { id: 's2', tags: ['park', 'walk', 'chill', 'picnic', 'tourist'], name: 'St Stephen’s Green', address: 'Dublin 2', category: 'park', lat: 53.3382, lng: -6.2591 },
  { id: 's3', tags: ['shopping', 'buskers', 'tourist'], name: 'Grafton Street', address: 'Dublin 2', category: 'street', lat: 53.342, lng: -6.26 },
  { id: 's4', tags: ['pub', 'trad music', 'historic', 'tourist'], name: 'The Brazen Head', address: 'Bridge Street', category: 'bar', lat: 53.3449, lng: -6.2766 },
  { id: 's5', tags: ['park', 'walk', 'deer', 'chill'], name: 'Phoenix Park', address: 'Dublin 8', category: 'park', lat: 53.3559, lng: -6.3298 },
  { id: 's6', tags: ['pub', 'historic'], name: 'The Long Hall', address: 'South Great George’s St', category: 'bar', lat: 53.3427, lng: -6.2647 },
  { id: 's7', tags: ['live music', 'gigs', 'comedy'], name: 'Vicar Street', address: 'The Liberties', category: 'music', lat: 53.3424, lng: -6.2793 },
  { id: 's8', tags: ['walk', 'sea'], name: 'Dún Laoghaire Pier', address: 'Dún Laoghaire', category: 'outdoor', lat: 53.2945, lng: -6.134 },
  { id: 's9', tags: ['tourist', 'nightlife', 'buskers'], name: 'Temple Bar Square', address: 'Temple Bar', category: 'street', lat: 53.3455, lng: -6.2643 },
  { id: 's10', tags: ['pub', 'chill'], name: 'Grogan’s', address: 'William Street South', category: 'bar', lat: 53.3417, lng: -6.2626 },
  { id: 's11', tags: ['pub', 'live music'], name: 'The Bernard Shaw', address: 'Richmond Street South', category: 'bar', lat: 53.3315, lng: -6.2652 },
]

const P = (id, vibe, caption, who, min, likes, ar, colors, extra = {}) => ({
  id: 'p' + id, venueId: 's' + id, vibe, caption, who, userId: who, createdAt: ago(min), likes, ar, colors,
  mediaUrl: null, mediaType: extra.video ? 'video' : 'image', fakeVideo: extra.video || 0,
  allowComments: extra.allowComments !== false,
})

const posts = [
  P(1, 'lit', 'Doors opened at nine and the floor is already full. The queue is moving fast.', 'aoife.d', 4, 312, '4/5', ['#ff2d55', '#7a1fa2', '#1a0b2e'], { video: 21 }),
  P(11, 'busy', 'Garden is packed and the DJ just started. Filmed from the back.', 'you', 6, 0, '4/5', ['#00c2a8', '#ff6f91', '#1b1030'], { video: 18 }),
  P(2, 'chill', 'Last of the sun by the pond. Someone is playing guitar near the bridge.', 'cian', 11, 148, '1/1', ['#ffd27a', '#2f8f6b', '#0f3d2e']),
  P(3, 'busy', 'Three buskers, one big crowd. The violinist outside Brown Thomas is unreal.', 'maeve.k', 18, 226, '3/4', ['#ffb347', '#d6336c', '#3b1330']),
  P(4, 'lit', 'Trad session in full swing. Snug seats are gone, standing room only.', 'donal', 22, 274, '4/6', ['#ff9a3c', '#8a2b0f', '#2a0c05'], { video: 34 }),
  P(5, 'dead', 'Deer, golden light, nobody else. Ideal if you want quiet.', 'sorcha', 35, 96, '5/4', ['#cfe8a8', '#4f7d4b', '#16301f']),
  P(6, 'busy', 'Warm, loud and full of regulars. A stool just opened at the bar.', 'ronan', 41, 131, '1/1', ['#e8b4a0', '#9c3d2e', '#2b0f0c'], { allowComments: false }),
  P(7, 'lit', 'Support act just finished and the room is buzzing.', 'lena.o', 47, 289, '3/4', ['#6a5cff', '#e0338f', '#120a33']),
  P(8, 'chill', 'Sunset walk, ice cream queue, harbour lights coming on.', 'tadhg', 62, 204, '4/5', ['#ffb199', '#4b79a1', '#0e2238']),
  P(9, 'busy', 'Fire juggler and a drum circle. Hard to get through but worth it.', 'niamh', 70, 177, '5/6', ['#f7d070', '#e4572e', '#34130b'], { video: 15 }),
  P(10, 'chill', 'Toastie, pint, window seat. Best seat in the city right now.', 'eoin.b', 80, 118, '4/5', ['#d9c2a0', '#7b5b3a', '#241a10']),
]

const C = (postId, who, verdict, body, min) => ({ id: postId + who, postId, who, verdict, body, createdAt: ago(min) })
const comments = [
  C('p1', 'sam.r', 'good', 'Went in at 9:15 with no wait. The sound is great tonight.', 3),
  C('p1', 'ciara', 'bad', 'Pints were €8.20 and the loos are a state. Fun crowd though.', 2),
  C('p2', 'jules', 'good', 'Plenty of free benches near the lake.', 9),
  C('p3', 'pat.m', 'good', 'The violinist is usually out from 7 to 9.', 12),
  C('p4', 'liam', 'good', 'Get here before ten if you want a seat near the musicians.', 15),
  C('p9', 'dara', 'bad', 'Overpriced and shoulder to shoulder. Skip it before 8pm.', 20),
]

const articles = [
  { id: 'a1', venueId: 's4', title: 'The Brazen Head, after dark', dek: 'Dublin’s oldest pub earns its reputation once the music starts.', author: 'Aoife Daly', minutes: 4, rating: 5, body: ['Come after nine and the front room turns into a live trad session. The musicians sit in the corner by the fire and nobody asks you to be quiet, only to listen.', 'The Guinness is poured properly and the staff move fast even when it’s packed. Go early for a seat, or stand by the courtyard door where you can still hear every tune.'] },
  { id: 'a2', venueId: 's10', title: 'Grogan’s and the case for the toastie', dek: 'The simplest lunch in the city, still done properly.', author: 'Eoin Byrne', minutes: 3, rating: 4, body: ['The ham and cheese toastie here has barely changed in years, and that is the point. It arrives hot, wrapped in foil, with a little relish on the side.', 'Take the window seat and let the afternoon go. It gets loud after six, so aim for the quieter hours if you want to hear your friends.'] },
  { id: 'a3', venueId: 's9', title: 'Temple Bar Square: is the crowd worth it?', dek: 'Great street performers, steep prices and very little elbow room.', author: 'Niamh Walsh', minutes: 3, rating: 2, body: ['The performers are the real draw. A fire juggler and a drum circle can make the square feel electric on a warm night.', 'But drinks nearby cost far more than they should, and before eight the square is shoulder to shoulder. Watch the show, then walk five minutes to a better pub.'] },
  { id: 'a4', venueId: 's5', title: 'Phoenix Park at golden hour', dek: 'Where to find quiet when the city gets loud.', author: 'Sorcha Lynch', minutes: 3, rating: 4, body: ['Enter from the Parkgate Street side and walk toward the deer. In the hour before sunset the light turns the whole field gold and the crowds thin out.', 'There is nowhere good for coffee nearby, so bring a flask. The walk back along the avenue is worth the extra ten minutes.'] },
]

export function sampleData() {
  const byPost = {}
  comments.forEach((c) => (byPost[c.postId] ||= []).push(c))
  return { venues, posts, articles, comments: byPost, liked: new Set(), saved: new Set(), sample: true }
}
