
"""
Master list of online sources for Christianity-related data.
Categorized for use in scraping and search targeting.
"""

CHRISTIAN_SOURCES = {
    "official_institutional": [
        "vatican.va",
        "press.vatican.va",
        "oikoumene.org",         # World Council of Churches
        "lausanne.org",          # Lausanne Movement
        "worldea.org",           # World Evangelical Alliance
        "csisouthindia.org",     # Church of South India
        "cnisynod.org",          # Church of North India
        "ecp-patriarchate.org",  # Ecumenical Patriarchate
        "efi.org.in",            # Evangelical Fellowship of India
        "indianchristiancouncil.in" 
    ],
    "media_christian": [
        "christianitytoday.com",
        "christianpost.com",
        "premierchristian.news",
        "cruxnow.com",
        "vaticannews.va",
        "catholicnewsagency.com",
        "ucanews.com",
        "asianews.it",
        "baptistpress.com",
        "religionnews.com"
    ],
    "media_secular_filtered": [
        "bbc.com",       # Query should append "Christianity" or "Religion"
        "reuters.com",
        "theguardian.com",
        "nytimes.com",
        "aljazeera.com",
        "thehindu.com",
        "timesofindia.indiatimes.com"
    ],
    "academic_research": [
        "pewresearch.org",
        "barna.com",
        "gallup.com",
        "worldreligiondatabase.org",
        "thearda.com",
        "arxiv.org",
        "semanticscholar.org",
        "crossref.org",
        "jstor.org"
    ],
    "bible_theology": [
        "biblegateway.com",
        "biblehub.com",
        "youversion.com",
        "blueletterbible.org",
        "desiringgod.org",
        "thegospelcoalition.org",
        "ligonier.org",
        "gotquestions.org",
        "crossway.org"
    ],
    "sermons_devotionals": [
        "sermonaudio.com",
        "sermoncentral.com"
    ],
    "social_community": [
        "reddit.com",
        "quora.com",
        "christianity.stackexchange.com"
    ],
    "ngos_persecution": [
        "opendoors.org",
        "persecution.org", # Voice of the Martyrs / ICC often share similar space, check specific domain for VOM
        "vom.org",         # Voice of the Martyrs
        "uscirf.gov",
        "amnesty.org",
        "hrw.org",
        "religiousfreedominstitute.org"
    ],
    "india_official": [
        "cbci.in",               # Catholic Bishops' Conference of India
        "ccbi.in",               # Conference of Catholic Bishops of India
        "csisouthindia.org",     # CSI (Church of South India)
        "cnisynod.org",          # CNI (Church of North India)
        "nccindia.in",           # National Council of Churches in India
        "efi.org.in",            # Evangelical Fellowship of India
        "ipcpentecostal.com",    # Indian Pentecostal Church of God
        "agindia.org",           # Assemblies of God India
        "sharonfellowship.com",  # Sharon Fellowship
        "nlfindia.com",          # New Life Fellowship India
        "believerseasternchurch.com", # Believers Church
        "gfa.org"                # Gospel for Asia
    ],
    "india_media": [
        "ucanews.com/india",
        "mattersindia.com",
        "indiancatholicmatters.org",
        "christiantoday.co.in",
        "catholicconnect.in",
        "heraldmalaysia.com",    # Check for India tag
        "thehindu.com",          # + Filter
        "indianexpress.com",     # + Filter
        "timesofindia.indiatimes.com", # + Filter
        "scroll.in",             # + Filter
        "thewire.in"             # + Filter
    ],
    "india_ngos_persecution": [
        "persecution.in",        # Persecution Relief
        "adfindia.org",          # Alliance Defending Freedom India
        "religiousliberty.in",   # EFI RLC
        "opendoors.org",         # Global, filter for India
        "vomindia.org"           # Voice of the Martyrs India (checking validity)
    ],
    "india_govt_legal": [
        "censusindia.gov.in",
        "minorityaffairs.gov.in",
        "ncm.nic.in",            # National Commission for Minorities
        "indiacode.nic.in",      # India Code (Central Acts)
        "legislative.gov.in",    # Legislative Department
        "nationalarchives.nic.in", # National Archives of India
        "s3waas.gov.in"          # S3WaaS (District/Govt Data)
    ],
    "india_academic": [
        "bsind.org",             # Bible Society of India
        "senamicollege.org",     # Senate of Serampore College
        "utc.edu.in",            # United Theological College
        "iijt.net"               # Indian Institute of Judeo-Christian Studies
    ],
    "india_multimedia": [
        "youtube.com",           # + Query: "Comforter TV", "Jesus Redeems Ministries"
        "angelchannel.org",
        "subhavam.org",
        "jesusredeems.com",      # Official Site
        "comfortertv.com"        # Official Site (if exists, or similar)
    ]

}

# RSS Feeds for NewsFeeder
# Verified or Standard patterns for the listed sites
RSS_FEEDS = [
    # Official / Major
    'https://www.christianitytoday.com/feed',
    'https://www.christianpost.com/rss/all',
    'https://premierchristian.news/feed',
    'https://cruxnow.com/feed',
    'https://www.vaticannews.va/en.rss.xml',
    'https://www.catholicnewsagency.com/rss/news.xml',
    'https://www.ucanews.com/feed', # Often needs specific category, trying general
    'https://www.baptistpress.com/feed',
    'https://religionnews.com/feed/',
    
    # Asian / Indian Context
    'http://www.asianews.it/rss/en.xml', # Common pattern for AsiaNews
    'https://www.mattersindia.com/feed/', # Corrected from matterindia if needed, but keeping existing if valid
    
    # Persecution / NGOs
    'https://www.persecution.org/feed/',
    'https://morningstarnews.org/feed/',
    'https://www.opendoors.org/rss.xml', # Generic guess, might need refinement
    
    # Theology / Devotionals (Blogs often have feeds)
    'https://www.desiringgod.org/feed',
    'https://www.thegospelcoalition.org/feed/',
    'https://www.challies.com/feed/', 
    
    # Youtube feeds can be generated if channel ID is known, ignoring for now as they are Video sources
]
