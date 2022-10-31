export const EVIDENCE_TMPLATE = `{% if evidence -%}
### Evidence

{% if evidence.truncated -%}
Displaying {{evidence.rowCount}} of {{evidence.fullCount}} rows. See more in the [NowSecure Report]({{assessmentLink}})

{% endif -%}
<details {% if evidence.rowCount <= 10%}open{% endif %}>
<summary>{{evidence.title}}</summary>

{{evidence.table}}

</details>
{%- endif %}`;
