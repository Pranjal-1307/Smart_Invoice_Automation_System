import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf():
    pdf_path = "big_demo_invoice_usd.pdf"
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#1E293B')
    )

    header_label = ParagraphStyle(
        'HeaderLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569')
    )

    header_val = ParagraphStyle(
        'HeaderVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0F172A')
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1E293B')
    )

    story = []

    # Title & Vendor Header
    story.append(Paragraph("NEXORA TECHNOLOGIES LLC", title_style))
    story.append(Paragraph("100 Innovation Boulevard, Suite 500, San Jose, CA 95110", header_val))
    story.append(Paragraph("Email: billing@nexoratech.example | Phone: +1 (800) 555-0198", header_val))
    story.append(Spacer(1, 15))

    # Header info table
    header_data = [
        [
            Paragraph("<b>INVOICE DETAILS</b>", header_label),
            Paragraph("<b>BILL TO & PO</b>", header_label)
        ],
        [
            Paragraph("Invoice Number: <b>INV-USD-2026-0847</b><br/>Invoice Date: <b>August 19, 2026</b><br/>Due Date: <b>September 18, 2026</b><br/>Currency: <b>USD</b>", header_val),
            Paragraph("Client: ACME Global Enterprises<br/>PO Number: <b>PO-78421-ACME</b><br/>Payment Terms: <b>Net 30</b>", header_val)
        ]
    ]

    h_table = Table(header_data, colWidths=[270, 270])
    h_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(h_table)
    story.append(Spacer(1, 15))

    story.append(Paragraph("<b>LINE ITEM DETAILS (PAGE 1 OF 2)</b>", header_label))
    story.append(Spacer(1, 6))

    # Define 36 items whose amounts sum up to $796,210.00 exactly!
    descriptions = [
        "Enterprise Automation Platform – Annual License",
        "High-Availability Cloud Database Node",
        "AI Workflow Automation Engine Module",
        "Microservices API Gateway Gateway Node",
        "Zero-Trust Network Access Control License",
        "Real-Time Data Streaming & Pipeline Connector",
        "Distributed In-Memory Cache Service Cluster",
        "Kubernetes Infrastructure Management Module",
        "Security Operations & Event Monitoring Node",
        "Automated Compliance & Audit Logger",
        "Enterprise SSO & SAML Authentication Gateway",
        "Disaster Recovery & Automated Backup Service",
        "High-Throughput Message Queue Instance",
        "ETL Data Ingestion Pipeline Acceleration",
        "Edge Compute Gateway Appliance Service",
        "AI Model Training Infrastructure Node",
        "Threat Detection & Vulnerability Scanner",
        "Cloud Storage Archival & Encryption Vault",
        "DevOps CI/CD Automation Pipeline Worker",
        "Load Balancing & Web Application Firewall",
        "Multi-Tenant Identity Management System",
        "Predictive Analytics & Reporting Dashboard",
        "GraphQL API Federation Server Infrastructure",
        "Log Aggregation & Performance Metrics Server",
        "Serverless Execution Environment Runtime",
        "Real-Time Telemetry & Alerting Agent",
        "Config Management & Secret Storage Vault",
        "Network Bandwidth Optimization Controller",
        "Enterprise Search Indexing Cluster Node",
        "SLA 24/7 Premium Support Package Q3",
        "Dedicated Solutions Architect Consulting",
        "Custom API Integration & Webhook Handler",
        "Database Migration & Data Cleanup Service",
        "Staff Training & Onboarding Workshops",
        "Security Penetration Testing & Audit",
        "Infrastructure Hardening & SLA Guarantee"
    ]

    total_subtotal_target = 796210.00
    current_sum = 0.0

    table_rows = [
        [
            Paragraph("<b>#</b>", table_header),
            Paragraph("<b>Description</b>", table_header),
            Paragraph("<b>Qty</b>", table_header),
            Paragraph("<b>Unit Price</b>", table_header),
            Paragraph("<b>Discount</b>", table_header),
            Paragraph("<b>Amount</b>", table_header)
        ]
    ]

    for i in range(1, 37):
        desc = descriptions[i-1]
        qty = (i % 5) + 1
        disc = 0 if (i % 3 != 0) else 5
        
        if i < 36:
            base_amt = 15000.00 + (i * 500.00)
            unit_price = round(base_amt / (qty * (1 - disc / 100.0)), 2)
            amount = round(qty * unit_price * (1 - disc / 100.0), 2)
            current_sum += amount
        else:
            amount = round(total_subtotal_target - current_sum, 2)
            unit_price = round(amount / (qty * (1 - disc / 100.0)), 2)

        row = [
            Paragraph(str(i), table_cell),
            Paragraph(desc, table_cell),
            Paragraph(str(qty), table_cell),
            Paragraph(f"${unit_price:,.2f}", table_cell),
            Paragraph(f"{disc}%", table_cell),
            Paragraph(f"${amount:,.2f}", table_cell)
        ]
        
        if i == 30:
            # Page 1 table ends at 29, Page 2 begins at 30
            p1_table = Table(table_rows, colWidths=[25, 235, 35, 80, 50, 115])
            p1_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('PADDING', (0,0), (-1,-1), 4),
            ]))
            story.append(p1_table)
            story.append(Spacer(1, 15))
            story.append(Paragraph("<i>Continued on Page 2...</i>", header_val))
            story.append(PageBreak())

            story.append(Paragraph("NEXORA TECHNOLOGIES LLC – INVOICE # INV-USD-2026-0847 (PAGE 2 OF 2)", header_label))
            story.append(Spacer(1, 10))

            table_rows = [
                [
                    Paragraph("<b>#</b>", table_header),
                    Paragraph("<b>Description</b>", table_header),
                    Paragraph("<b>Qty</b>", table_header),
                    Paragraph("<b>Unit Price</b>", table_header),
                    Paragraph("<b>Discount</b>", table_header),
                    Paragraph("<b>Amount</b>", table_header)
                ]
            ]

        table_rows.append(row)

    p2_table = Table(table_rows, colWidths=[25, 235, 35, 80, 50, 115])
    p2_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(p2_table)
    story.append(Spacer(1, 15))

    totals_data = [
        [Paragraph("Subtotal:", header_label), Paragraph("$796,210.00", header_val)],
        [Paragraph("Sales Tax (8.25%):", header_label), Paragraph("$65,687.32", header_val)],
        [Paragraph("Shipping & Handling:", header_label), Paragraph("$1,850.00", header_val)],
        [Paragraph("<b>Total Due (USD):</b>", ParagraphStyle('TBig', parent=header_label, fontSize=11, leading=14)), Paragraph("<b>$863,747.32</b>", ParagraphStyle('TValBig', parent=header_val, fontSize=11, leading=14))]
    ]
    t_table = Table(totals_data, colWidths=[150, 120])
    t_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#94A3B8')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    
    wrapper = Table([[Paragraph("", header_val), t_table]], colWidths=[270, 270])
    story.append(wrapper)

    doc.build(story)
    print("big_demo_invoice_usd.pdf generated successfully!")

if __name__ == '__main__':
    generate_pdf()
