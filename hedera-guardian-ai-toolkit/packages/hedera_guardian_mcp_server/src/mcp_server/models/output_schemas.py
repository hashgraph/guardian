from pydantic import BaseModel, Field

from vector_store import SearchResult


class MethodologyDocumentMetadata(BaseModel):
    chunk_id: int
    heading: str
    headings: list[str]
    # page_no is NULL in your example, so we use Optional
    page_no: int | None = None
    token_count: int
    source: str
    source_format: str
    source_name: str
    has_formula: bool = False
    has_table: bool = False
    has_figure: bool = False
    # These appear to be lists based on the brackets []
    formulas_declaration: list[str] = Field(default_factory=list)
    formulas_references: list[str] = Field(default_factory=list)
    tables_declaration: list[str] = Field(default_factory=list)


class MethodologyDocumentPayload(BaseModel):
    document_chunk: str
    metadata: MethodologyDocumentMetadata


class MethodologyDocumentSearchResult(SearchResult):
    metadata: MethodologyDocumentMetadata


class SchemaPropertyMetadata(BaseModel):
    name: str
    full_path: str
    type: list[str]
    description: str
    ancestors: list[str]
    source: str
    path_root: str
    methodology: str


class SchemaPropertyPayload(BaseModel):
    document_chunk: str
    metadata: SchemaPropertyMetadata


class SchemaPropertySearchResult(SearchResult):
    metadata: SchemaPropertyMetadata
