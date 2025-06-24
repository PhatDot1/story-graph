TODO:
QUERY FOR ALL OTHER INFO LIKE
Derivatives
Disputes
Raised
Creators

Consider filtering out assets without an imageURI?


Asset Resources
View Asset
View Metadata
Open in Explorer
Open in Portal
Royalty Payments
No royalty payments found for this IP

And most importantly:
Available Licenses

SWITCH D3 USAGE TO:
Pixi.js or Sigma.js FOR HIGHER PERFORMANCE AND INCREASING NUMBER OF NODES IN GRAPHS

OR Try Hosting via Python Web Visualization:
streamlit
Plotly Dash	
Voilà
gradio

hostijg:
Render.com
Fly.io
 



VERCEL IS JUST TOO FRAGILE PERIOD. EMBED VISUALIZATION INTO AN <iframe> FOR MY OWN VISUALIZATION ON GCP AND TRY THIS SOLUTION



# IP Radar – IP Knowledge Graph Explorer

A graph-based interface for exploring, attributing, and understanding on-chain intellectual property, built with Story Protocol.

![IP Radar Dashboard](https://via.placeholder.com/800x400?text=IP+Radar+Dashboard)

## What is IP Radar?

IP Radar is a visual discovery tool for the emerging world of on-chain IP. It lets users search for creative works registered on Story Protocol and explore how they've been remixed, forked, or reused across the ecosystem.

With just a few clicks, users can trace an original story's forks, view who licensed it, and follow chains of creative contribution. All through a dynamic, interactive graph.

## Why it Matters

Creative ecosystems thrive when ideas are shared, built upon, and properly attributed. Story Protocol makes this possible on‑chain, but currently, there's no visual way to see the relationships between works or understand the revenue that flows through them.

IP Radar solves this by providing a knowledge graph for IP with economic insight. Here's who it helps:

- **Creators** can showcase their full creative universe of adaptations, forks, licensed uses, and see real-time royalty terms and revenue splits associated with each derivative.
- **Remixers** can easily discover what IP is available to build on, under what license, and with full transparency on royalty obligations.
- **DAOs, publishers, and curators** gain the ability to visually inspect both the provenance and economic impact of a work, helping inform licensing decisions, curation, or investments.
- **Story Protocol** benefits from a tool that not only makes composability visible but also reveals programmable revenue flows, reinforcing its value as an IP layer with real economic utility.

IP Radar brings clarity, trust, usability, and crucially, transparency into royalty and licensing flows, to the Story ecosystem, laying the foundation for licensing dashboards, payout tracking, and creator-led economies in the future.

## Features

- **Search for IP** by title or creator
- **Explore remix graphs** that show on-chain derivation relationships (IP Edges)
- **Click nodes** to reveal license terms, remix type, and creator attribution
- **"My IPs" view** (via Tomo login) lets users explore their own registered assets
- **Semantic Network** (prototype) links related IP that may not be formally forked, based on metadata or content similarity
- **Yakoa integration** flags potential unauthorized derivatives for attribution tracking

![Graph Visualization](https://via.placeholder.com/600x400?text=IP+Relationship+Graph)

## Story Protocol Integration

IP Radar is deeply integrated with Story Protocol's infrastructure:

### Smart Contract Integration
We query on-chain properties of all IP using Story Protocol's core contracts:

```typescript
const IP_ASSET_REGISTRY = "0x77319B4031e6eF1250907aa00018B8B1c67a244b";
const LICENSE_REGISTRY = "0x529a750E02d8E2f15649c13D69a465286a780e24";
const PIL_TEMPLATE = "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316";
const LICENSING_MODULE = "0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f";
const DISPUTE_MODULE = "0x[Coming Soon]";
const ROYALTY_MODULE = "0x[Coming Soon]";
```

### Data Pipeline

- **Ingested IP asset data** from the Story Protocol API, including pagination and recovery handling
- **Queried on-chain metadata** and relationships for each asset using Story smart contracts on the Aeneid testnet
- **Computed derivative and dispute links** between assets via Story event logs
- **Visualized the network** of assets, contracts, and derivatives using structured Story asset data
- **Integrated Story IP licensing**, ownership, and royalty data into the frontend experience for exploration and analysis


### API Integration

We integrated Story's REST API and TypeScript SDK server-side to:

- Fetch IP assets and metadata (`/assets/ip/{id}`)
- Retrieve derivation links (`/assets/edges?parentIpId=…`)
- Read license terms and royalty settings


This powers both the IP Detail View and the connected Remix Graph UI by combining node metadata, contractual rights, and on-chain relationships.

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Blockchain**: Story Protocol (Aeneid Testnet), Ethers.js v6
- **Data Processing**: Python, LangGraph, Sentence Transformers
- **AI/ML**: BLIP (image captioning), Ollama (LLM), all-MiniLM-L6-v2 (embeddings)
- **Authentication**: Tomo Web SDK
- **APIs**: Story Protocol REST API, Yakoa API
- **Visualization**: D3.js, Cytoscape.js
- **Storage**: IPFS, Local JSON processing


## Partner Integrations

### Tomo

Enables walletless login so creators and fans can explore IP without needing MetaMask or a crypto wallet. Powers the "My IPs" dashboard and seamless user onboarding.

### Yakoa

Provides originality and similarity detection. Used to flag likely remixes or copies that are not formally registered as derivatives on-chain, encouraging better attribution and linking.

## Semantic Analysis Pipeline

IP Radar includes advanced semantic analysis to discover relationships between IP assets that may not be formally linked on-chain:

### Image Captioning

```python
# Using BLIP for automatic image description
from transformers import BlipProcessor, BlipForConditionalGeneration

processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

def caption_image(url):
    image = Image.open(requests.get(url, stream=True).raw).convert("RGB")
    inputs = processor(image, return_tensors="pt").to(device)
    output = model.generate(**inputs, max_new_tokens=30)
    return processor.decode(output[0], skip_special_tokens=True)
```

### Vector Embeddings

```python
# Creating semantic embeddings for similarity matching
from sentence_transformers import SentenceTransformer

MODEL = SentenceTransformer("all-MiniLM-L6-v2")

def create_embedding(description_text):
    return MODEL.encode(description_text).tolist()
```

### LLM-Powered Metadata Extraction

Using Ollama with Llama3 to intelligently extract relevant fields from NFT metadata for better semantic understanding.

## How to Run Locally

### Requirements

- Node.js v18+
- Python 3.9+ (for semantic analysis)
- Story Protocol API access
- Tomo test credentials (for social login testing)
- Yakoa API key (for advanced features)
- Ollama (for LLM features)


### Installation

1. **Clone the repository**


```shellscript
git clone https://github.com/your-org/ip-radar.git
cd ip-radar
```

2. **Install dependencies**


```shellscript
npm install
```

3. **Set up environment variables**


```shellscript
cp .env.example .env.local
```

Fill in your environment variables:

```plaintext
NEXT_PUBLIC_TOMO_CLIENT_ID=your_tomo_client_id
STORY_API_KEY=your_story_api_key
YAKOA_API_KEY=your_yakoa_api_key
```

4. **Install Python dependencies** (for semantic analysis)


```shellscript
pip install -r requirements.txt
```

5. **Set up Ollama** (optional, for LLM features)


```shellscript
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the Llama3 model
ollama pull llama3
```

6. **Run the development server**


```shellscript
npm run dev
```

7. **Process semantic data** (optional)


```shellscript
# Generate image captions
python scripts/caption_images.py

# Create vector embeddings
python scripts/create_embeddings.py
```

### Data Processing Pipeline

The semantic analysis pipeline consists of several stages:

1. **Asset Ingestion**: Fetch IP assets from Story Protocol API
2. **Image Captioning**: Generate descriptions for visual content using BLIP
3. **Metadata Extraction**: Use LLM to identify relevant metadata fields
4. **Vector Embedding**: Create semantic embeddings for similarity matching
5. **Graph Construction**: Build relationship graphs based on semantic similarity


## Project Structure

```plaintext
ip-radar/
├── src/
│   ├── app/                    # Next.js app router pages
│   ├── components/             # React components
│   ├── contexts/               # React contexts (wallet, data)
│   ├── lib/                    # Utility functions and API clients
│   └── types/                  # TypeScript type definitions
├── scripts/
│   ├── caption_images.py       # Image captioning pipeline
│   ├── create_embeddings.py    # Vector embedding generation
│   └── process_assets.py       # Asset data processing
├── public/                     # Static assets
└── data/                       # Processed data files
```

## Roadmap

### Phase 1: Enhanced Visualization (Q1 2024)

- Visual overlays for royalty terms and revenue flows
- Real-time data updates via WebSocket connections
- Advanced graph filtering and search capabilities
- Mobile-responsive graph interface


### Phase 2: Interactive Features (Q2 2024)

- Licensing and remix request interface
- Shareable public graphs per IP
- Collaborative annotation and tagging
- Integration with Story Protocol's licensing marketplace


### Phase 3: AI-Powered Insights (Q3 2024)

- Smart recommendations via semantic clustering
- Automated similarity detection and flagging
- Trend analysis and market insights
- Predictive licensing recommendations


### Phase 4: Enterprise Features (Q4 2024)

- API for third-party integrations
- White-label solutions for IP platforms
- Advanced analytics dashboard
- Bulk IP management tools


## Next Steps

### Infrastructure

- **Real-time data processing**: Move from batch processing to real-time ETL pipelines
- **Backend hosting**: Deploy scalable backend infrastructure for data processing
- **API optimization**: Implement caching and optimization for Story Protocol API calls


### Semantic Analysis

- **Edge case handling**: Improve robustness of metadata extraction and embedding generation
- **Data quality**: Implement better data validation and cleaning processes
- **Model optimization**: Fine-tune embedding models for IP-specific content
- **Auto-flagging system**: Develop automated systems for detecting potential IP violations


### User Experience

- **Performance optimization**: Implement lazy loading and virtualization for large graphs
- **Accessibility**: Ensure full accessibility compliance for graph interfaces
- **Internationalization**: Add support for multiple languages


## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Story Protocol** for providing the foundational IP infrastructure
- **Tomo** for enabling seamless wallet-less authentication
- **Yakoa** for advanced similarity detection capabilities
- The open-source community for the amazing tools and libraries that make this possible

