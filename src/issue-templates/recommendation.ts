/**
 * Exports the default template for recommendations and the
 * partials required by the template
 */

export const RECOMMENDATION_TEMPLATE = `{% if recommendation -%}
### Remediation Resources

{% if hasFix -%}
#### Recommended fix

{{recommendation}}

{% if codeSamples -%}
#### Code Samples

{% for sample in codeSamples.samples -%}
{{sample.caption}} ({{sample.syntax}})
\`\`\`{{sample.syntax}}
{{sample.block}}
\`\`\`

{% endfor -%}
{% endif -%}
{%if guidanceLinks -%}
#### Additional

{% for link in guidanceLinks.links -%}
- {{link.caption}} [{{link.url}}]({{link.url}})
{% endfor -%}
{% endif -%}
{% else -%}
### Recommendation

{{recommendation}}
{%- endif %}
{%- endif %}`;
