/* ===========================================================================
   PeroTech Blog — your posts live here.
   ---------------------------------------------------------------------------
   Each post has some meta (title, excerpt, cover, etc.) and a `blocks` array.
   Mix and match as many blocks as you want in a single post:

     { type: "paragraph", text: "Supports <b>HTML</b> and <a href='#'>links</a>." }
     { type: "heading",    text: "A section title" }
     { type: "subheading", text: "A smaller title" }
     { type: "list",       items: ["point one", "point two"] }
     { type: "quote",      text: "A highlighted quote." }
     { type: "image",      src: "assets/img/...", caption: "optional caption" }
     { type: "video",      kind: "mp4",     src: "assets/motion/videos/x.mp4", caption: "" }
     { type: "video",      kind: "youtube", src: "YOUTUBE_VIDEO_ID", caption: "" }
     { type: "code",       language: "js",  code: "const x = 1;" }
     { type: "file",       name: "guide.pdf", src: "assets/files/guide.pdf", size: "1.2 MB" }

   To add a post: copy one of the objects below, change the `slug` (must be
   unique, no spaces), fill in the meta and blocks. Newest first.
   =========================================================================== */

const BLOG_POSTS = [
  {
    slug: "automate-client-videos-with-ai",
    title: "How I Automate Client Videos with AI (Full Workflow)",
    excerpt:
      "The exact pipeline I use to turn a client brief into a finished motion-graphics ad — scripting, rendering, editing, and delivery, mostly on autopilot.",
    cover: "assets/motion/thumbs/techflow.jpg",
    category: "Tutorial",
    date: "2026-06-12",
    author: "PeroTech",
    readTime: "6 min read",
    blocks: [
      { type: "paragraph", text: "Most of my client videos now start as a one-paragraph brief and end as a delivered ad — with AI doing the heavy lifting in between. Here's the full workflow, step by step, including the tools, prompts, and code I use." },
      { type: "heading", text: "The pipeline at a glance" },
      { type: "list", items: [
        "Capture the brief in plain language",
        "Generate a script + storyboard with an LLM",
        "Render shots and motion elements",
        "Auto-assemble a rough cut",
        "Polish and deliver",
      ] },
      { type: "image", src: "assets/motion/thumbs/skyline.jpg", caption: "A brand intro produced almost entirely from a text brief." },
      { type: "heading", text: "Step 1 — Turn the brief into a script" },
      { type: "paragraph", text: "I keep a reusable prompt that takes the client's brief and returns a scene-by-scene storyboard with on-screen text and pacing notes." },
      { type: "code", language: "text", code: "You are a senior motion designer.\nTurn this brief into a 30s ad storyboard with\nscene-by-scene direction, on-screen text, and pacing.\n\nBRIEF: <paste client brief here>" },
      { type: "subheading", text: "Kick off the render job" },
      { type: "code", language: "bash", code: "# start the automation worker\nn8n start\n\n# trigger a render from the approved storyboard\ncurl -X POST http://localhost:5678/webhook/render \\\n  -H \"Content-Type: application/json\" \\\n  -d '{ \"project\": \"techflow\", \"format\": \"mp4\" }'" },
      { type: "paragraph", text: "On the frontend I just hit my own endpoint and poll for the finished URL:" },
      { type: "code", language: "js", code: "const res = await fetch('/api/render', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ project: 'techflow' }),\n});\nconst data = await res.json();\nconsole.log('Render ready:', data.url);" },
      { type: "heading", text: "The result" },
      { type: "paragraph", text: "Here's one of the finished ads produced with this exact pipeline:" },
      { type: "video", kind: "mp4", src: "assets/motion/videos/techflow.mp4", caption: "TechFlow product launch — generated from a one-paragraph brief." },
      { type: "quote", text: "Stop trying to think and type at the same time. Talk the idea out, then let AI structure it." },
      { type: "heading", text: "Grab the blueprint" },
      { type: "paragraph", text: "I packaged the prompts and the step-by-step checklist into a single file you can download and adapt:" },
      { type: "file", name: "perotech-automation-blueprint.txt", src: "assets/files/perotech-automation-blueprint.txt", size: "1 KB" },
      { type: "paragraph", text: "That's the whole loop. Replace the sample assets with your own and you've got a repeatable system for client work." },
    ],
  },
  {
    slug: "5-motion-graphics-trends-2026",
    title: "5 Motion Graphics Trends Brands Are Paying For in 2026",
    excerpt:
      "From AI-assisted 3D to kinetic typography that actually converts — the styles clients keep asking me for this year.",
    cover: "assets/motion/thumbs/pulse.jpg",
    category: "Insights",
    date: "2026-05-28",
    author: "PeroTech",
    readTime: "4 min read",
    blocks: [
      { type: "paragraph", text: "Every year the look of paid video shifts. Here are the five styles brands are spending real budget on in 2026." },
      { type: "list", items: [
        "AI-assisted 3D product reveals",
        "Bold kinetic typography",
        "Hand-drawn / mixed-media overlays",
        "Ultra-short vertical ads",
        "Data-driven motion (animated charts & UI)",
      ] },
      { type: "video", kind: "mp4", src: "assets/motion/videos/pulse.mp4", caption: "Vertical social promo — one of the fastest-growing formats." },
      { type: "paragraph", text: "Want any of these for your brand? Head to the contact page and let's talk." },
    ],
  },
  {
    slug: "from-brief-to-delivery",
    title: "From Brief to Delivery: How I Work With Clients",
    excerpt:
      "A transparent look at my process, timelines, and what you can expect when we work together on a project.",
    cover: "assets/motion/thumbs/lumen.jpg",
    category: "Behind the scenes",
    date: "2026-05-10",
    author: "PeroTech",
    readTime: "3 min read",
    blocks: [
      { type: "paragraph", text: "Clear process makes for happy clients. Here's exactly how a project runs from first message to final files." },
      { type: "subheading", text: "1. Discovery" },
      { type: "paragraph", text: "We start with a short call to nail down goals, audience, and references." },
      { type: "subheading", text: "2. Storyboard & approval" },
      { type: "paragraph", text: "You approve a storyboard before any heavy production begins — no surprises." },
      { type: "subheading", text: "3. Production & delivery" },
      { type: "paragraph", text: "I produce, you review one round of revisions, and I deliver the final files in every format you need." },
      { type: "image", src: "assets/motion/thumbs/ecodrive.jpg", caption: "A commercial delivered in broadcast and social formats." },
    ],
  },
];
