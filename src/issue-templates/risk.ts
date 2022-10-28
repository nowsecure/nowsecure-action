export const RISK_TEMPLATE = `### Risk and Regulatory Information
{% if risk.severity -%}
- Severity: {{risk.severity}}
{% endif %}
{%- if risk.cvss -%}
- CVSS: {{risk.cvss}}
{% endif %}
{%- if risk.cve -%}
- CVE: {{risk.cve}}
{% endif %}
{%- for risk in risk.regulations.items %}
- {{risk.label}}: {% for link in risk.links -%}
    {% if link.url -%}
      [{{ link.title }}]({{ link.url }})
    {%- else -%}
      {{ link.title }}
    {%- endif -%}
    {% unless forloop.last %}, {% endunless %}
  {%- endfor %}
{%- endfor %}`;
