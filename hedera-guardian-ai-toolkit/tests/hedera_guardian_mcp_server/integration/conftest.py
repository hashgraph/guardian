import asyncio
import uuid

import pytest
import pytest_asyncio
from fastembed import TextEmbedding
from fastmcp.client import Client
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from mcp_server.server import HederaGuardianMCPServer
from vector_store import QdrantConnector
from vector_store.embeddings.fastembed import FastEmbedProvider
from vector_store.models import DocumentPayload


@pytest.fixture
def mock_collection_name() -> str:
    return "test_collection"


@pytest.fixture
def mock_fastembeded_model_name() -> str:
    return "BAAI/bge-small-en-v1.5"  # Use a supported fastembed model


@pytest.fixture
def mock_vector_size() -> int:
    return 384  # BAAI/bge-small-en-v1.5 vector dimension


@pytest.fixture
def mock_document_data_science_question() -> str:
    return "What are the common questions about data science?"


@pytest.fixture
def mock_document_data_science_best_answer(mock_document_chunks) -> str:
    return mock_document_chunks[0]["text"]


@pytest.fixture
def mock_document_chunks() -> list[dict]:
    return [
        {
            "text": "Q&A: Common Questions About Data Science\n\nQ: What is the difference between data science and traditional approaches?\nA: Data science offers faster processing through automated\nprocesses and advanced algorithms, whereas traditional methods rely heavily\non manual intervention and rule-based systems.\n\nQ: Which tools are recommended for data science?\nA: Popular choices include Node.js and PostgreSQL, each\noffering unique advantages depending on your specific use case and scale\nrequirements.\n\nQ: What are typical implementation challenges?\nA: Common obstacles include integration complexity and \nscalability issues, which require careful planning and expertise\nto overcome successfully.",
            "metadata": {
                "chunk_id": 0,
                "heading": "Common Questions About Data Science",
                "headings": ["Q&A", "Data Science"],
                "token_count": 92,
                "source": "integration_test",
                "source_format": "pdf",
                "source_name": "methodology_verra",
                "page_no": 1,
                "has_formula": False,
                "has_table": False,
                "has_figure": False,
                "formulas_declaration": [],
                "formulas_references": [],
                "tables_declaration": [],
            },
        },
        {
            "text": "Research Paper: Advances in Artificial Intelligence\n\nAbstract: This paper presents novel approaches to artificial intelligence, demonstrating\nsignificant improvements over baseline methods. Our experiments conducted\non 6 different datasets show accuracy improvements of\n6.3% while reducing computational requirements by\n44%.\n\nThe proposed methodology combines Hadoop with innovative\nalgorithmic optimizations. Results indicate strong generalization across\ndiverse scenarios with statistical significance (p < 0.5).\nFuture work will explore cloud computing applications and scalability\nto larger problem domains.\n\nKeywords: artificial intelligence, Elasticsearch, optimization, performance",
            "metadata": {
                "chunk_id": 1,
                "heading": "Advances in Artificial Intelligence",
                "headings": ["Research Paper", "AI Advances"],
                "token_count": 80,
                "source": "integration_test",
                "source_format": "pdf",
                "source_name": "methodology_gs",
                "page_no": 2,
                "has_formula": False,
                "has_table": True,
                "has_figure": False,
                "formulas_declaration": [],
                "formulas_references": [],
                "tables_declaration": ["Table 1: Dataset Results"],
            },
        },
        {
            "text": "Industry Update: Machine Learning Trends in Agriculture\nPublished: February 21, 2025\n\nRecent developments in machine learning are transforming the agriculture sector,\nwith industry leaders investing heavily in new capabilities. Market analysis\nsuggests growth rates of 18% annually over the next\n5 years.\n\nExperts predict that competitive advantage will become increasingly\nimportant as adoption accelerates. However, organizations must address\nregulatory compliance to fully realize the potential benefits.\nLeading vendors have announced new partnerships and product launches\ntargeting this expanding market opportunity.",
            "metadata": {
                "chunk_id": 2,
                "heading": "Machine Learning Trends in Agriculture",
                "headings": ["Industry Update", "ML Trends"],
                "token_count": 80,
                "source": "integration_test",
                "source_format": "pdf",
                "source_name": "methodology_verra",
                "page_no": 3,
                "has_formula": False,
                "has_table": False,
                "has_figure": False,
                "formulas_declaration": [],
                "formulas_references": [],
                "tables_declaration": [],
            },
        },
        {
            "text": "Research Paper: Advances in Cloud Computing\n\nAbstract: This paper presents novel approaches to cloud computing, demonstrating\nsignificant improvements over baseline methods. Our experiments conducted\non 6 different datasets show accuracy improvements of\n6.4% while reducing computational requirements by\n20%.\n\nThe proposed methodology combines Kafka with innovative\nalgorithmic optimizations. Results indicate strong generalization across\ndiverse scenarios with statistical significance (p < 0.4).\nFuture work will explore cloud computing applications and scalability\nto larger problem domains.\n\nKeywords: cloud computing, PostgreSQL, optimization, performance",
            "metadata": {
                "chunk_id": 3,
                "heading": "Advances in Cloud Computing",
                "headings": ["Research Paper", "Cloud Computing"],
                "token_count": 80,
                "source": "integration_test",
                "source_format": "pdf",
                "source_name": "methodology_gs",
                "page_no": 4,
                "has_formula": True,
                "has_table": True,
                "has_figure": False,
                "formulas_declaration": ["Equation 1: Performance Model"],
                "formulas_references": ["eq:perf"],
                "tables_declaration": ["Table 1: Benchmark Results"],
            },
        },
        {
            "text": "Q&A: Common Questions About Digital Transformation\n\nQ: What is the difference between digital transformation and traditional approaches?\nA: Digital transformation offers innovation through automated\nprocesses and advanced algorithms, whereas traditional methods rely heavily\non manual intervention and rule-based systems.\n\nQ: Which tools are recommended for digital transformation?\nA: Popular choices include Kubernetes and Hadoop, each\noffering unique advantages depending on your specific use case and scale\nrequirements.\n\nQ: What are typical implementation challenges?\nA: Common obstacles include technical debt and \nscalability issues, which require careful planning and expertise\nto overcome successfully.",
            "metadata": {
                "chunk_id": 4,
                "heading": "Common Questions About Digital Transformation",
                "headings": ["Q&A", "Digital Transformation"],
                "token_count": 91,
                "source": "integration_test",
                "source_format": "pdf",
                "source_name": "methodology_cdm",
                "page_no": 5,
                "has_formula": False,
                "has_table": False,
                "has_figure": False,
                "formulas_declaration": [],
                "formulas_references": [],
                "tables_declaration": [],
            },
        },
        {
            "text": "Tutorial: Optimizing with Kubernetes\n\nStep 1: Environment Setup\nInstall Kubernetes version 3.13 and \nconfigure your development environment with the necessary dependencies.\n\nStep 2: Core Implementation\nInitialize the Kubernetes framework and configure the primary modules. Set\nparameters including batch_size=32, \nlearning_rate=0.001, and \nmax_iterations=3789.\n\nStep 3: Validation and Testing\nRun the test suite to verify functionality. Expected execution time is\napproximately 218 seconds depending on hardware configuration.",
            "metadata": {
                "chunk_id": 5,
                "heading": "Optimizing with Kubernetes",
                "headings": ["Tutorial", "Kubernetes"],
                "token_count": 64,
                "source": "integration_test",
                "source_format": "docx",
                "source_name": "methodology_cdm",
                "page_no": 6,
                "has_formula": False,
                "has_table": False,
                "has_figure": False,
                "formulas_declaration": [],
                "formulas_references": [],
                "tables_declaration": [],
            },
        },
        {
            "text": "Technical Overview: Analyzing cybersecurity with Kubernetes\n\nThis document covers the implementation details of analyzing cybersecurity solutions \nusing Kubernetes. The system architecture consists of multiple microservices that \ncommunicate through asynchronous message queues. Performance benchmarks show \nthroughput of approximately 43146 requests per second \nwith latency under 84ms at the 95th percentile.\n\nKey considerations include vendor lock-in and ensuring \nscalability. The deployment pipeline integrates CI/CD practices\nwith automated testing covering 86% of the codebase.",
            "metadata": {
                "chunk_id": 6,
                "heading": "Analyzing Cybersecurity with Kubernetes",
                "headings": ["Technical Overview", "Cybersecurity"],
                "token_count": 71,
                "source": "integration_test",
                "source_format": "docx",
                "source_name": "methodology_verra",
                "page_no": 7,
                "has_formula": True,
                "has_table": False,
                "has_figure": False,
                "formulas_declaration": ["Equation 1: Throughput Model"],
                "formulas_references": ["eq:throughput"],
                "tables_declaration": [],
            },
        },
        {
            "text": "Q&A: Common Questions About Blockchain\n\nQ: What is the difference between blockchain and traditional approaches?\nA: Blockchain offers improved accuracy through automated\nprocesses and advanced algorithms, whereas traditional methods rely heavily\non manual intervention and rule-based systems.\n\nQ: Which tools are recommended for blockchain?\nA: Popular choices include Elasticsearch and GCP, each\noffering unique advantages depending on your specific use case and scale\nrequirements.\n\nQ: What are typical implementation challenges?\nA: Common obstacles include skill gaps and \nchange management, which require careful planning and expertise\nto overcome successfully.",
            "metadata": {
                "chunk_id": 7,
                "heading": "Common Questions About Blockchain",
                "headings": ["Q&A", "Blockchain"],
                "token_count": 88,
                "source": "integration_test",
                "source_format": "pdf",
                "source_name": "methodology_verra",
                "page_no": 8,
                "has_formula": False,
                "has_table": False,
                "has_figure": False,
                "formulas_declaration": [],
                "formulas_references": [],
                "tables_declaration": [],
            },
        },
        {
            "text": "Research Paper: Advances in Data Science\n\nAbstract: This paper presents novel approaches to data science, demonstrating\nsignificant improvements over baseline methods. Our experiments conducted\non 9 different datasets show accuracy improvements of\n22.2% while reducing computational requirements by\n57%.\n\nThe proposed methodology combines Azure with innovative\nalgorithmic optimizations. Results indicate strong generalization across\ndiverse scenarios with statistical significance (p < 0.1).\nFuture work will explore cloud computing applications and scalability\nto larger problem domains.\n\nKeywords: data science, AWS, optimization, performance",
            "metadata": {
                "chunk_id": 8,
                "heading": "Advances in Data Science",
                "headings": ["Research Paper", "Data Science"],
                "token_count": 80,
                "source": "integration_test",
                "source_format": "pdf",
                "source_name": "methodology_gs",
                "page_no": 9,
                "has_formula": False,
                "has_table": True,
                "has_figure": False,
                "formulas_declaration": [],
                "formulas_references": [],
                "tables_declaration": ["Table 1: Performance Metrics"],
            },
        },
        {
            "text": "Research Paper: Advances in Cybersecurity\n\nAbstract: This paper presents novel approaches to cybersecurity, demonstrating\nsignificant improvements over baseline methods. Our experiments conducted\non 5 different datasets show accuracy improvements of\n23.5% while reducing computational requirements by\n51%.\n\nThe proposed methodology combines TensorFlow with innovative\nalgorithmic optimizations. Results indicate strong generalization across\ndiverse scenarios with statistical significance (p < 0.5).\nFuture work will explore quantum computing applications and scalability\nto larger problem domains.\n\nKeywords: cybersecurity, Spark, optimization, performance",
            "metadata": {
                "chunk_id": 9,
                "heading": "Advances in Cybersecurity",
                "headings": ["Research Paper", "Cybersecurity"],
                "token_count": 77,
                "source": "integration_test",
                "source_format": "pdf",
                "source_name": "methodology_cdm",
                "page_no": 10,
                "has_formula": False,
                "has_table": False,
                "has_figure": False,
                "formulas_declaration": [],
                "formulas_references": [],
                "tables_declaration": [],
            },
        },
        {
            "text": "Tutorial: Deploying with Node.js\n\nStep 1: Environment Setup\nInstall Node.js version 1.20 and \nconfigure your development environment with the necessary dependencies.\n\nStep 2: Core Implementation\nInitialize the Node.js framework and configure the primary modules. Set\nparameters including batch_size=16, \nlearning_rate=0.0001, and \nmax_iterations=6889.\n\nStep 3: Validation and Testing\nRun the test suite to verify functionality. Expected execution time is\napproximately 46 seconds depending on hardware configuration.",
            "metadata": {
                "chunk_id": 10,
                "heading": "Deploying with Node.js",
                "headings": ["Tutorial", "Node.js"],
                "token_count": 64,
                "source": "integration_test",
                "source_format": "docx",
                "source_name": "methodology_cdm",
                "page_no": 11,
                "has_formula": False,
                "has_table": False,
                "has_figure": False,
                "formulas_declaration": [],
                "formulas_references": [],
                "tables_declaration": [],
            },
        },
        {
            "text": "Research Paper: Advances in Blockchain\n\nAbstract: This paper presents novel approaches to blockchain, demonstrating\nsignificant improvements over baseline methods. Our experiments conducted\non 6 different datasets show accuracy improvements of\n17.5% while reducing computational requirements by\n32%.\n\nThe proposed methodology combines Kafka with innovative\nalgorithmic optimizations. Results indicate strong generalization across\ndiverse scenarios with statistical significance (p < 0.2).\nFuture work will explore machine learning applications and scalability\nto larger problem domains.\n\nKeywords: blockchain, Redis, optimization, performance",
            "metadata": {
                "chunk_id": 11,
                "heading": "Advances in Blockchain",
                "headings": ["Research Paper", "Blockchain"],
                "token_count": 77,
                "source": "integration_test",
                "source_format": "pdf",
                "source_name": "methodology_gs",
                "page_no": 12,
                "has_formula": True,
                "has_table": True,
                "has_figure": False,
                "formulas_declaration": ["Equation 1: Consensus Algorithm"],
                "formulas_references": ["eq:consensus"],
                "tables_declaration": ["Table 1: Comparison Results"],
            },
        },
        {
            "text": "Case Study: Cloud Computing in Manufacturing\n\nA leading manufacturing company successfully implemented cloud computing solutions,\nresulting in improved accuracy and a 81% improvement in \noperational metrics. The project, completed over 10 months,\ninvolved cross-functional teams and required an investment of \n$3990K.\n\nROI was realized within 24 months, with ongoing benefits\nincluding better user experience and better user experience. The success\nfactors included executive sponsorship, agile methodology, and continuous\nstakeholder engagement throughout the implementation lifecycle.",
            "metadata": {
                "chunk_id": 12,
                "heading": "Cloud Computing in Manufacturing",
                "headings": ["Case Study", "Cloud Computing"],
                "token_count": 74,
                "source": "integration_test",
                "source_format": "pdf",
                "source_name": "methodology_cdm",
                "page_no": 13,
                "has_formula": False,
                "has_table": False,
                "has_figure": False,
                "formulas_declaration": [],
                "formulas_references": [],
                "tables_declaration": [],
            },
        },
        {
            "text": "Q&A: Common Questions About Software Development\n\nQ: What is the difference between software development and traditional approaches?\nA: Software development offers innovation through automated\nprocesses and advanced algorithms, whereas traditional methods rely heavily\non manual intervention and rule-based systems.\n\nQ: Which tools are recommended for software development?\nA: Popular choices include PostgreSQL and Azure, each\noffering unique advantages depending on your specific use case and scale\nrequirements.\n\nQ: What are typical implementation challenges?\nA: Common obstacles include vendor lock-in and \ndata privacy concerns, which require careful planning and expertise\nto overcome successfully.",
            "metadata": {
                "chunk_id": 13,
                "heading": "Common Questions About Software Development",
                "headings": ["Q&A", "Software Development"],
                "token_count": 92,
                "source": "integration_test",
                "source_format": "pdf",
                "source_name": "methodology_verra",
                "page_no": 14,
                "has_formula": False,
                "has_table": False,
                "has_figure": False,
                "formulas_declaration": [],
                "formulas_references": [],
                "tables_declaration": [],
            },
        },
        {
            "text": "Q&A: Common Questions About Artificial Intelligence\n\nQ: What is the difference between artificial intelligence and traditional approaches?\nA: Artificial intelligence offers cost reduction through automated\nprocesses and advanced algorithms, whereas traditional methods rely heavily\non manual intervention and rule-based systems.\n\nQ: Which tools are recommended for artificial intelligence?\nA: Popular choices include TensorFlow and React, each\noffering unique advantages depending on your specific use case and scale\nrequirements.\n\nQ: What are typical implementation challenges?\nA: Common obstacles include vendor lock-in and \nvendor lock-in, which require careful planning and expertise\nto overcome successfully.",
            "metadata": {
                "chunk_id": 14,
                "heading": "Common Questions About Artificial Intelligence",
                "headings": ["Q&A", "Artificial Intelligence"],
                "token_count": 92,
                "source": "integration_test",
                "source_format": "docx",
                "source_name": "methodology_verra",
                "page_no": 15,
                "has_formula": True,
                "has_table": False,
                "has_figure": False,
                "formulas_declaration": ["Equation 1: Cost Model"],
                "formulas_references": ["eq:cost"],
                "tables_declaration": [],
            },
        },
    ]


@pytest.fixture
def fastembed_provider(mock_fastembeded_model_name) -> FastEmbedProvider:
    """Provides a mocked FastEmbedProvider for testing."""
    return FastEmbedProvider(model_name=mock_fastembeded_model_name)


@pytest_asyncio.fixture
async def async_qdrant_client_with_data(
    mock_vector_size, mock_collection_name, mock_fastembeded_model_name, mock_document_chunks
) -> AsyncQdrantClient:
    """Provides a Qdrant client for testing."""
    client = AsyncQdrantClient(":memory:")

    await client.create_collection(
        collection_name=mock_collection_name,
        vectors_config={"dense": VectorParams(size=mock_vector_size, distance=Distance.COSINE)},
    )

    doc_chunk_texts = [doc_chunk["text"] for doc_chunk in mock_document_chunks]

    # make embeddings for mock documents
    embedding_model = TextEmbedding(mock_fastembeded_model_name)

    loop = asyncio.get_running_loop()
    embeddings = await loop.run_in_executor(
        None, lambda: list(embedding_model.passage_embed(doc_chunk_texts))
    )

    mock_document_chunks_to_points = [
        PointStruct(
            id=uuid.uuid4().hex,
            vector={"dense": embedding.tolist()},
            payload=DocumentPayload(
                document_chunk=doc_chunk["text"], metadata=doc_chunk.get("metadata", {})
            ).model_dump(),
        )
        for doc_chunk, embedding in zip(mock_document_chunks, embeddings, strict=False)
    ]

    await client.upsert(
        collection_name=mock_collection_name,
        points=mock_document_chunks_to_points,
    )

    return client


@pytest_asyncio.fixture
async def qdrant_connector(fastembed_provider, async_qdrant_client_with_data, mock_collection_name):
    connector = QdrantConnector(
        url="http://localhost:6333",
        embedding_provider=fastembed_provider,
        collection_name=mock_collection_name,
    )
    # Replace internal client with the one that has test data
    connector._client = async_qdrant_client_with_data
    return connector


@pytest_asyncio.fixture
async def mcp_client(qdrant_connector):
    """Fixture to create an MCP client for testing."""
    mcp = HederaGuardianMCPServer(
        schema_connector=qdrant_connector,
        methodology_connector=qdrant_connector,
    )

    async with Client(transport=mcp) as mcp_client:
        yield mcp_client
