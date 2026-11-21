# How search works in iOS 27, and the Glassline recreation

## Evidence

Grades are the same as in `EVIDENCE.md`. A = Apple developer material fetched and quoted. B = search-result summaries whose pages could not be fetched here. D = forum or anecdotal.

### The model Apple describes (grade A)
Apple's sessions say "the 27 releases", not "iOS 27" by name.

| # | Mechanism | Quote | Source |
|---|---|---|---|
| 1 | Apps put content into a system **semantic index** by adopting `IndexedEntity` | "The primary way to power entity resolution is by adopting IndexedEntity. When you do this, your app's entities are indexed into the system semantic index." | [WWDC26 session 240](https://developer.apple.com/videos/play/wwdc2026/240/) |
| 2 | Matching is by **meaning**, not only text | "This allows Siri to match based on meaning, not just text, understand relationships between entities, and even answer questions over your content." | session 240 |
| 3 | `indexingKey` marks which properties are searchable | "The indexingKey tells Spotlight which properties, like the message body, should be searchable." | session 240 |
| 4 | Indexing call | `try await CSSearchableIndex(name: indexName).indexAppEntities([entity])`; "populates the Spotlight semantic index" | [WWDC26 session 343](https://developer.apple.com/videos/play/wwdc2026/343/) |
| 5 | The index must be **maintained** by the app | "Index new entities as people add content to your app. Update existing entries when key properties change… When people remove content, delete those index entries too." | session 343 |
| 6 | The system can ask for a **reindex** | "Spotlight may need your app to reindex its entities. Your app can support reindexing by adopting the new IndexedEntityQuery." | session 343 |
| 7 | Content that can't be indexed ahead of time is queried **live** | `EntityStringQuery`: "Siri hands you the person's input. Your app is responsible for finding matching entities." It also gives "You don't get semantic understanding." `IntentValueQuery` gives structured input and multiple entity types. | sessions 240, 343 |
| 8 | When to skip indexing | "if your content dataset is large, lives on a server, or changes too frequently to index ahead of time." | session 343 |
| 9 | **Actions** appear in search | "that action can show up across the system in places like Shortcuts, Spotlight, Widgets, and more." | session 240 |
| 10 | In-app search schema renamed | "The .system search schema introduced in iOS 17 is now named .system.searchInApp." | session 343 |
| 11 | Semantic search depends on the domain | "depending on the App Intents domain, indexing entities in Spotlight provides semantic search capabilities." | session 343 |
| 12 | Results display | "Siri can display a list of entity search results." `DisplayRepresentation`s are used by "Spotlight and Shortcuts". | session 343 |

Apple's example code (session 240, 7:59):
```swift
@AppEntity(schema: .messages.message)
struct MessageEntity: IndexedEntity {
    @Property(indexingKey: \.textContent)
    var body: AttributedString?
}
```

### Reported, not verified here (grade B)
From search-result summaries. These hosts didn't resolve from this environment.
- Spotlight, Photos, Mail and Siri share one rebuilt semantic index. Mail search for "dentist" finds a dental clinic's email that never uses the word. ([heise](https://www.heise.de/en/news/iOS-27-Apple-improves-Spotlight-search-new-support-document-online-11432349.html), [guide4mac](https://guide4mac.com/news/ios-27-mail-search-platform-index/), [letsdatascience](https://letsdatascience.com/news/apple-rebuilds-search-infrastructure-powering-spotlight-and-b37590b7))
- A "Search or Ask" interface replaces classic Spotlight, opened by **swiping down from the middle of the display**.
- The index covers more on-device content and stays current through the day. First-time vector indexing can take hours or days and runs fastest when the phone is idle, charging and on Wi-Fi. ([techbetweenthelines](https://www.techbetweenthelines.com/ios-27s-indexing-in-progress-explained-why-its-happening-and-how-long-it-takes/))
- A `SpotlightSearchTool` lets a Foundation Models session search an app's Core Spotlight index. ([blakecrosley.com](https://blakecrosley.com/blog/on-device-ai-spotlight-media-ios-27))
- Some beta testers report faster keyword search. Others doubt basic keyword search improved.

### Caveats (grade D)
- [Forum thread 835563](https://developer.apple.com/forums/thread/835563): a developer reports entities showing in Spotlight on iOS 27, but Siri answering from the web instead. Apple DTS: "Spotlight acts as a database… Siri cannot spontaneously read the properties of your BuildingEntity to answer a conversational question… unless you explicitly build an Intent."
- Not documented anywhere fetched: ranking formula, how results are grouped, latency targets, or the embedding model.

## The recreation

`prototype/search-engine.js` (no dependencies, runs in a browser or in Node) and the search UI in `prototype/index.html`.

| iOS 27 concept | Glassline |
|---|---|
| `IndexedEntity` with `indexingKey` | Entities with `id`, `type`, `title`, `keys`, `body`. Fields weighted 3 / 1.5 / 1 |
| `indexAppEntities`, delete on removal | `index.add()` (an existing id is replaced), `index.remove()` |
| `IndexedEntityQuery` reindex | `index.reindex()`. On launch the index builds in batches of 6 on idle frames, with a status line |
| Semantic index | **Meaning ranker**: concept-set cosine from a lexicon of 23 concepts. A deterministic stand-in for an embedding model |
| Keyword search | **Keyword ranker**: field-weighted, IDF-scaled, prefix match on the word being typed, coverage penalty |
| (typo tolerance) | **Typo ranker**: trigram Dice similarity of each word to the closest title or key word, threshold 0.45 |
| Ranking | Reciprocal Rank Fusion (k = 10; weights keyword 1, meaning 0.8, typo 0.6) plus a small type prior |
| `EntityStringQuery` | `index.addProvider()`. A Contacts provider is queried live after 140 ms and shown in its own section. A failing provider is ignored |
| Actions in Spotlight | Action entities (New note, Dark Mode, glass level, Summarize) run when chosen |
| `DisplayRepresentation` and attribution | Each row: icon, highlighted title and subtitle, source app, and badges saying why it matched (meaning, typo, live) |
| "Search or Ask" from mid-screen swipe (B) | Swipe down in the Home Screen's middle band; the reveal follows the finger and velocity projection decides. An "Ask" row hands the query to the assistant |

Other details: Top Hit, sections ordered by their best result, arrow keys and Enter, recent searches (browser storage), and a Search inspector beside the device showing each ranker's rank and the latency.

### Tests
- `node tests/search.test.js`: 21 checks, including:
  - "dentist" finds a note about a cleaning appointment, labelled *meaning*;
  - "wether" finds Weather;
  - updates, removal and reindex;
  - provider failure is ignored;
  - 2,000 entities search in about 3 ms per keystroke.
- `node tests/e2e.js`: drives the real gesture and UI.
  - swipe opens search, the meaning and typo results appear, live contacts arrive;
  - Enter opens the top hit;
  - a note created by the assistant is searchable at once and opens into its detail page;
  - the Ask row hands off to the assistant.

### Using it in another project
```js
const index = GlasslineSearch.createIndex();          // or require("./search-engine.js")
index.add([{ id: "note:1", type: "note", title: "Dr. Patel", body: "Cleaning Tuesday 3 pm" }]);
index.addProvider({ name: "Contacts", query: async q => fetchContacts(q) });
const { results } = index.search("dentist");           // results[0].why → ["meaning"]
const { top, sections } = index.group(results, { labels: { note: "Notes" } });
const live = await index.searchProviders("dentist");
```
To use a real embedding model, replace `meaning()` in `search-engine.js` with cosine similarity over stored vectors. The fusion step doesn't change.
