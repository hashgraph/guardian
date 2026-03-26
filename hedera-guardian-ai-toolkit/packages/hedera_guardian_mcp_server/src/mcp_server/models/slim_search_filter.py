from pydantic import BaseModel, Field
from qdrant_client import models


class FieldCondition(BaseModel):
    key: str = Field(
        default=models.FieldCondition.model_fields["key"].default,
        description=models.FieldCondition.model_fields["key"].description,
    )
    match: models.Match | None = Field(
        default=models.FieldCondition.model_fields["match"].default,
        description=models.FieldCondition.model_fields["match"].description,
    )
    range: models.RangeInterface | None = Field(
        default=models.FieldCondition.model_fields["range"].default,
        description=models.FieldCondition.model_fields["range"].description,
    )

    def to_qdrant(self) -> models.FieldCondition:
        """Convert to Qdrant FieldCondition model."""
        return models.FieldCondition(
            key=self.key,
            match=self.match,
            range=self.range,
        )


Condition = FieldCondition | models.IsEmptyCondition | models.IsNullCondition


class SearchFilter(BaseModel):
    should: list[Condition] | Condition | None = Field(
        default=models.Filter.model_fields["should"].default,
        description=models.Filter.model_fields["should"].description,
    )
    must: list[Condition] | Condition | None = Field(
        default=models.Filter.model_fields["must"].default,
        description=models.Filter.model_fields["must"].description,
    )
    must_not: list[Condition] | Condition | None = Field(
        default=models.Filter.model_fields["must_not"].default,
        description=models.Filter.model_fields["must_not"].description,
    )

    def to_qdrant(self) -> models.Filter:
        """Convert SearchFilter to Qdrant Filter model."""
        filter_kwargs = {}

        if self.should is not None:
            if isinstance(self.should, list):
                filter_kwargs["should"] = [
                    cond.to_qdrant() if isinstance(cond, FieldCondition) else cond
                    for cond in self.should
                ]
            else:
                cond = self.should
                filter_kwargs["should"] = (
                    cond.to_qdrant() if isinstance(cond, FieldCondition) else cond
                )

        if self.must is not None:
            if isinstance(self.must, list):
                filter_kwargs["must"] = [
                    cond.to_qdrant() if isinstance(cond, FieldCondition) else cond
                    for cond in self.must
                ]
            else:
                cond = self.must
                filter_kwargs["must"] = (
                    cond.to_qdrant() if isinstance(cond, FieldCondition) else cond
                )

        if self.must_not is not None:
            if isinstance(self.must_not, list):
                filter_kwargs["must_not"] = [
                    cond.to_qdrant() if isinstance(cond, FieldCondition) else cond
                    for cond in self.must_not
                ]
            else:
                cond = self.must_not
                filter_kwargs["must_not"] = (
                    cond.to_qdrant() if isinstance(cond, FieldCondition) else cond
                )

        return models.Filter(**filter_kwargs)
