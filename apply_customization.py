import re
import json

def update_index():
    with open("index.html.bak", "r", encoding="utf-8") as f:
        content = f.read()

    # ----------------------------------------------------
    # 0. Overflow prevention on html, body, and container
    # ----------------------------------------------------
    content = content.replace(
        '<html lang="en" class="geist_6d4fd719-module__r-bcpW__variable antialiased dark">',
        '<html lang="en" class="geist_6d4fd719-module__r-bcpW__variable antialiased dark overflow-x-hidden">'
    )
    content = content.replace(
        '<body class="min-h-dvh">',
        '<body class="min-h-dvh overflow-x-hidden">'
    )
    content = content.replace(
        '<div class="relative mx-auto flex min-h-dvh max-w-[1920px] flex-col px-5 py-6 sm:px-10 lg:px-16">',
        '<div class="relative mx-auto flex min-h-dvh max-w-[1920px] flex-col px-5 py-6 sm:px-10 lg:px-16 overflow-x-hidden">'
    )

    # ----------------------------------------------------
    # 1. SSR HTML Replacements
    # ----------------------------------------------------

    # Title & Description & Meta
    content = content.replace(
        '<title>Aryan Kumar</title><meta name="description" content="Aryan Kumar — web developer and creative coder. Builds things where design meets engineering.">',
        '<title>Manzil Shrestha</title><meta name="description" content="Manzil Shrestha — AI &amp; Data Science Engineer. Building end-to-end ML systems, transformer pipelines, and applied AI applications.">'
    )

    content = content.replace(
        '<meta property="og:title" content="Aryan Kumar"><meta property="og:description" content="Aryan Kumar — web developer and creative coder. Builds things where design meets engineering."><meta property="og:url" content="https://devaryan.com"><meta property="og:site_name" content="Aryan Kumar">',
        '<meta property="og:title" content="Manzil Shrestha"><meta property="og:description" content="Manzil Shrestha — AI &amp; Data Science Engineer. Building end-to-end ML systems, transformer pipelines, and applied AI applications."><meta property="og:url" content="https://manzilshrestha.dev"><meta property="og:site_name" content="Manzil Shrestha">'
    )

    content = content.replace(
        '<meta property="og:image:alt" content="Aryan Kumar, web developer and creative coder, beside a dot drawing of Krishna playing the flute">',
        '<meta property="og:image:alt" content="Manzil Shrestha, AI &amp; Data Science Engineer, beside a 3D particle visualization">'
    )

    content = content.replace(
        '<meta name="twitter:title" content="Aryan Kumar"><meta name="twitter:description" content="Aryan Kumar — web developer and creative coder. Builds things where design meets engineering.">',
        '<meta name="twitter:title" content="Manzil Shrestha"><meta name="twitter:description" content="Manzil Shrestha — AI &amp; Data Science Engineer. Building end-to-end ML systems, transformer pipelines, and applied AI applications.">'
    )

    content = content.replace(
        '<meta name="twitter:image:alt" content="Aryan Kumar, web developer and creative coder, beside a dot drawing of Krishna playing the flute">',
        '<meta name="twitter:image:alt" content="Manzil Shrestha, AI &amp; Data Science Engineer, beside a 3D particle visualization">'
    )

    content = content.replace(
        '<link rel="canonical" href="https://devaryan.com">',
        '<link rel="canonical" href="https://manzilshrestha.dev">'
    )

    # Schema.org JSON-LD in SSR
    old_schema = '{"@context":"https://schema.org","@type":"Person","name":"Aryan Kumar","url":"https://devaryan.com/","jobTitle":"Web developer and creative coder","description":"I\'m a web developer and creative coder. I work where design meets engineering: fluid interfaces, rendering pipelines, and the low-level mechanics that make software feel alive rather than just functional.","sameAs":["https://github.com/aryanjha256","https://www.linkedin.com/in/thearyankumar","https://x.com/aryaninsync"]}'
    new_schema = '{"@context":"https://schema.org","@type":"Person","name":"Manzil Shrestha","url":"https://manzilshrestha.dev/","jobTitle":"AI & Data Science Engineer","description":"Manzil Shrestha — AI & Data Science Engineer. Building end-to-end ML systems, transformer pipelines, and applied AI applications.","sameAs":["https://github.com/Manzil777","https://www.linkedin.com/in/manzil-shrestha-6b0607218/","https://x.com/manzilshrestha9"]}'
    content = content.replace(old_schema, new_schema)

    # Hero H1
    content = content.replace(
        '<h1 class="mt-1 text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">Aryan<!-- -->.</h1>',
        '<h1 class="mt-1 text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">Manzil<!-- -->.</h1>'
    )

    # Hero Bio
    old_bio = '<div class="mt-3 space-y-4 text-sm leading-normal text-muted lg:mt-6 lg:text-[15px] lg:leading-relaxed"><p>I\'m a web developer and creative coder. I work where design meets engineering: fluid interfaces, rendering pipelines, and the low-level mechanics that make software feel alive rather than just functional.</p><p class="hidden lg:block">By day I build web interfaces at StrideOne. The rest of the time I make command-line tools, libraries and small experiments, like zeal, a jq for logs.</p></div>'
    new_bio = '<div class="mt-3 space-y-4 text-sm leading-normal text-muted lg:mt-6 lg:text-[15px] lg:leading-relaxed"><p>Final-year AI &amp; Data Science student at CMRIT Bengaluru building end-to-end machine learning systems, from NLP pipelines to full-stack deployments. Hands-on experience with PyTorch, transformer models (ESM-2), and applied statistical modeling.</p><p class="hidden lg:block">Seeking ML, data science, or applied AI internship roles where I can ship production-ready solutions.</p></div>'
    content = content.replace(old_bio, new_bio)

    # Social links in SSR
    content = content.replace('href="https://github.com/aryanjha256"', 'href="https://github.com/Manzil777"')
    content = content.replace('href="https://www.linkedin.com/in/thearyankumar"', 'href="https://www.linkedin.com/in/manzil-shrestha-6b0607218/"')
    content = content.replace('href="https://x.com/aryaninsync"', 'href="https://x.com/manzilshrestha9"')

    # Tab counts: Projects: 06 -> 03, Work: 04 -> 01
    content = content.replace(
        'Projects<sup class="ml-0.5 text-[10px] tabular-nums text-muted">06</sup>',
        'Projects<sup class="ml-0.5 text-[10px] tabular-nums text-muted">03</sup>'
    )
    content = content.replace(
        'Work<sup class="ml-0.5 text-[10px] tabular-nums text-muted">04</sup>',
        'Work<sup class="ml-0.5 text-[10px] tabular-nums text-muted">01</sup>'
    )

    # Tagline footer in SSR
    old_tagline = 'Will happily talk Souls-likes, cricket or Rust with anyone.'
    new_tagline = 'Will happily talk machine learning, transformer models, or cricket with anyone.'
    content = content.replace(old_tagline, new_tagline)

    # OL 0: Projects SSR (symmetrical ~19-20 char details)
    old_ol0_match = re.search(r'<ol id="_R_dlflb_-panel-0"[^>]*>.*?</ol>', content)
    if not old_ol0_match:
        raise Exception("Could not find OL 0 (Projects)")
    old_ol0 = old_ol0_match.group(0)

    new_ol0 = (
        '<ol id="_R_dlflb_-panel-0" role="tabpanel" aria-labelledby="_R_dlflb_-tab-0" class="grid grid-cols-2 content-start gap-x-4 [grid-area:1/1] lg:block ">'
        '<li data-shape="project:proteinclassify" data-summary="Bioinformatics platform classifying protein sequences across 321 families with real-time 3D structure predictions via ESMFold." data-title="ProteinClassify" class="group"><a href="https://github.com/Manzil777/ProteinClassify" target="_blank" rel="noopener noreferrer" class="flex items-baseline gap-2.5 border-b border-line py-2 lg:gap-4 lg:py-3 transition-colors hover:text-muted"><span class="w-6 shrink-0 text-xs tabular-nums text-muted">01</span><span class="min-w-0 truncate transition-colors group-data-pinned:text-accent lg:shrink-0 lg:overflow-visible">ProteinClassify</span><span class="hidden min-w-0 flex-1 truncate text-right text-xs text-muted lg:block">Meta ESM-2 · PyTorch</span></a></li>'
        '<li data-shape="project:sentiment-analysis" data-summary="End-to-end NLP pipeline classifying 1,000+ student feedback entries with 88% accuracy and automated SMTP workflows." data-title="Sentiment Analysis" class="group"><a href="https://github.com/Manzil777/Sentiment-Analysis" target="_blank" rel="noopener noreferrer" class="flex items-baseline gap-2.5 border-b border-line py-2 lg:gap-4 lg:py-3 transition-colors hover:text-muted"><span class="w-6 shrink-0 text-xs tabular-nums text-muted">02</span><span class="min-w-0 truncate transition-colors group-data-pinned:text-accent lg:shrink-0 lg:overflow-visible">Sentiment Analysis</span><span class="hidden min-w-0 flex-1 truncate text-right text-xs text-muted lg:block">NLP · Scikit-Learn</span></a></li>'
        '<li data-shape="project:soletrack" data-summary="Lightweight retail footwear POS &amp; inventory management system with role-based auth, SKU-level tracking, and stock analytics." data-title="SoleTrack" class="group"><a href="https://github.com/Manzil777/SoleTrack" target="_blank" rel="noopener noreferrer" class="flex items-baseline gap-2.5 border-b border-line py-2 lg:gap-4 lg:py-3 transition-colors hover:text-muted"><span class="w-6 shrink-0 text-xs tabular-nums text-muted">03</span><span class="min-w-0 truncate transition-colors group-data-pinned:text-accent lg:shrink-0 lg:overflow-visible">SoleTrack</span><span class="hidden min-w-0 flex-1 truncate text-right text-xs text-muted lg:block">POS · PHP · MariaDB</span></a></li>'
        '</ol>'
    )
    content = content.replace(old_ol0, new_ol0)

    # OL 1: Work SSR (ONLY The FOOT's Nepal)
    old_ol1_match = re.search(r'<ol id="_R_dlflb_-panel-1"[^>]*>.*?</ol>', content)
    if not old_ol1_match:
        raise Exception("Could not find OL 1 (Work)")
    old_ol1 = old_ol1_match.group(0)

    new_ol1 = (
        '<ol id="_R_dlflb_-panel-1" role="tabpanel" aria-labelledby="_R_dlflb_-tab-1" inert="" class="grid grid-cols-2 content-start gap-x-4 [grid-area:1/1] lg:block invisible pointer-events-none">'
        '<li data-shape="work:the-foots-nepal" data-summary="Led requirement analysis and system architecture for retail inventory platform SoleTrack; streamlined inventory workflows." data-title="The FOOT&#x27;s Nepal" class="group"><button type="button" class="flex items-baseline gap-2.5 border-b border-line py-2 lg:gap-4 lg:py-3 w-full text-left"><span class="w-6 shrink-0 text-xs tabular-nums text-muted">01</span><span class="min-w-0 truncate transition-colors group-data-pinned:text-accent lg:shrink-0 lg:overflow-visible">The FOOT&#x27;s Nepal</span><span class="hidden min-w-0 flex-1 truncate text-right text-xs text-muted lg:block">Design &amp; Requirements</span></button></li>'
        '</ol>'
    )
    content = content.replace(old_ol1, new_ol1)

    # ----------------------------------------------------
    # 2. RSC Flight Payload Replacements
    # ----------------------------------------------------
    pushes = list(re.finditer(r'<script>(self\.__next_f\.push\(\[([0-9]+),(.*?)\]\))</script>', content))
    print(f"Total pushes found: {len(pushes)}")

    updated_pushes = {}

    for idx, m in enumerate(pushes):
        chunk_id = m.group(2)
        raw_val = m.group(3)
        decoded = json.loads(raw_val)

        if idx == 1:
            # Replace schema.org
            decoded = decoded.replace(
                '{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Person\\",\\"name\\":\\"Aryan Kumar\\",\\"url\\":\\"https://devaryan.com/\\",\\"jobTitle\\":\\"Web developer and creative coder\\",\\"description\\":\\"I\'m a web developer and creative coder. I work where design meets engineering: fluid interfaces, rendering pipelines, and the low-level mechanics that make software feel alive rather than just functional.\\",\\"sameAs\\":[\\"https://github.com/aryanjha256\\",\\"https://www.linkedin.com/in/thearyankumar\\",\\"https://x.com/aryaninsync\\"]}',
                '{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Person\\",\\"name\\":\\"Manzil Shrestha\\",\\"url\\":\\"https://manzilshrestha.dev/\\",\\"jobTitle\\":\\"AI & Data Science Engineer\\",\\"description\\":\\"Manzil Shrestha — AI & Data Science Engineer. Building end-to-end ML systems, transformer pipelines, and applied AI applications.\\",\\"sameAs\\":[\\"https://github.com/Manzil777\\",\\"https://www.linkedin.com/in/manzil-shrestha-6b0607218/\\",\\"https://x.com/manzilshrestha9\\"]}'
            )

            # Replace H1 ["Aryan","."] -> ["Manzil","."]
            decoded = decoded.replace(
                '"children":["Aryan","."]',
                '"children":["Manzil","."]'
            )

            # Replace Paragraph 1
            decoded = decoded.replace(
                '["$","p","I\'m a web develo",{"className":"$undefined","children":"I\'m a web developer and creative coder. I work where design meets engineering: fluid interfaces, rendering pipelines, and the low-level mechanics that make software feel alive rather than just functional."}]',
                '["$","p","Final-year AI & ",{"className":"$undefined","children":"Final-year AI & Data Science student at CMRIT Bengaluru building end-to-end machine learning systems, from NLP pipelines to full-stack deployments. Hands-on experience with PyTorch, transformer models (ESM-2), and applied statistical modeling."}]'
            )
            updated_pushes[idx] = json.dumps(decoded, ensure_ascii=False)

        elif idx == 2:
            # Replace Paragraph 2 (exact string without escaping)
            decoded = decoded.replace(
                '9:["$","p","By day I build w",{"className":"hidden lg:block","children":"By day I build web interfaces at StrideOne. The rest of the time I make command-line tools, libraries and small experiments, like zeal, a jq for logs."}]',
                '9:["$","p","Seeking ML, data",{"className":"hidden lg:block","children":"Seeking ML, data science, or applied AI internship roles where I can ship production-ready solutions."}]'
            )
            updated_pushes[idx] = json.dumps(decoded, ensure_ascii=False)

        elif idx == 3:
            # Replace Social links
            decoded = decoded.replace('https://github.com/aryanjha256', 'https://github.com/Manzil777')
            decoded = decoded.replace('https://www.linkedin.com/in/thearyankumar', 'https://www.linkedin.com/in/manzil-shrestha-6b0607218/')
            decoded = decoded.replace('https://x.com/aryaninsync', 'https://x.com/manzilshrestha9')
            updated_pushes[idx] = json.dumps(decoded, ensure_ascii=False)

        elif idx == 5:
            prefix = 'c:'
            if decoded.startswith(prefix):
                clean_json_str = decoded[len(prefix):].rstrip('\n')
                tabs_data = json.loads(clean_json_str)
                tabs_list = tabs_data[3]["children"][3]["tabs"]

                # 0 is Projects (symmetrical concise details)
                tabs_list[0]["rows"] = [
                    {
                        "title": "ProteinClassify",
                        "detail": "Meta ESM-2 · PyTorch",
                        "href": "https://github.com/Manzil777/ProteinClassify",
                        "shape": "project:proteinclassify",
                        "summary": "Bioinformatics platform classifying protein sequences across 321 families with real-time 3D structure predictions via ESMFold."
                    },
                    {
                        "title": "Sentiment Analysis",
                        "detail": "NLP · Scikit-Learn",
                        "href": "https://github.com/Manzil777/Sentiment-Analysis",
                        "shape": "project:sentiment-analysis",
                        "summary": "End-to-end NLP pipeline classifying 1,000+ student feedback entries with 88% accuracy and automated SMTP workflows."
                    },
                    {
                        "title": "SoleTrack",
                        "detail": "POS · PHP · MariaDB",
                        "href": "https://github.com/Manzil777/SoleTrack",
                        "shape": "project:soletrack",
                        "summary": "Lightweight retail footwear POS & inventory management system with role-based auth, SKU-level tracking, and stock analytics."
                    }
                ]

                # 1 is Work (ONLY The FOOT's Nepal)
                tabs_list[1]["rows"] = [
                    {
                        "title": "The FOOT's Nepal",
                        "detail": "Design & Requirements",
                        "shape": "work:the-foots-nepal",
                        "summary": "Led requirement analysis and system architecture for retail inventory platform SoleTrack; streamlined inventory workflows."
                    }
                ]

                # 2 is Life - retained
                decoded = prefix + json.dumps(tabs_data, separators=(',', ':'), ensure_ascii=False) + '\n'
                updated_pushes[idx] = json.dumps(decoded, ensure_ascii=False)
            else:
                raise Exception("decoded does not start with c:")

        elif idx == 6:
            decoded = decoded.replace(
                'Will happily talk Souls-likes, cricket or Rust with anyone.',
                'Will happily talk machine learning, transformer models, or cricket with anyone.'
            )
            updated_pushes[idx] = json.dumps(decoded, ensure_ascii=False)

        elif idx == 9:
            decoded = decoded.replace('Aryan Kumar', 'Manzil Shrestha')
            decoded = decoded.replace(
                'Aryan Kumar — web developer and creative coder. Builds things where design meets engineering.',
                'Manzil Shrestha — AI & Data Science Engineer. Building end-to-end ML systems, transformer pipelines, and applied AI applications.'
            )
            decoded = decoded.replace(
                'Aryan Kumar, web developer and creative coder, beside a dot drawing of Krishna playing the flute',
                'Manzil Shrestha, AI & Data Science Engineer, beside a 3D particle visualization'
            )
            decoded = decoded.replace('https://devaryan.com', 'https://manzilshrestha.dev')
            updated_pushes[idx] = json.dumps(decoded, ensure_ascii=False)

    for idx in sorted(updated_pushes.keys(), reverse=True):
        m = pushes[idx]
        new_tag = f'<script>self.__next_f.push([{m.group(2)},{updated_pushes[idx]}])</script>'
        content = content[:m.start()] + new_tag + content[m.end():]

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(content)

    print("index.html successfully updated with symmetric layout and clean Work tab!")

if __name__ == "__main__":
    update_index()
