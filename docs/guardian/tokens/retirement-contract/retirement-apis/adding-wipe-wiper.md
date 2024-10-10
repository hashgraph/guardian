# Adding Wipe Wiper

{% swagger method="post" path="" baseUrl="/contracts/wipe/{contractId}/wiper/{hederaId}" summary="Add wipe wiper." %}
{% swagger-description %}
Add wipe contract wiper. Only users with the Standard Registry role are allowed to make the request.
{% endswagger-description %}

{% swagger-parameter in="path" name="hederaId" type="String" required="true" %}
Hedera Identifier
{% endswagger-parameter %}

{% swagger-parameter in="path" name="contractId" type="String" required="true" %}
Contract Identifier
{% endswagger-parameter %}
{% endswagger %}
