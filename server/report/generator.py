"""
ProteinRescue AI - Predictive Treatment & Simulation Report Generator
Outputs multi-page PDF report with matplotlib charts and ReportLab layout.
Deterministic execution from JSON input over stdin; no external network or API calls.
"""
import sys
import os
import tempfile
os.environ.setdefault("MPLCONFIGDIR", os.path.join(tempfile.gettempdir(), "matplotlib-cache"))
import json
import io
import math
import datetime
from xml.sax.saxutils import escape as _sax_escape

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image as PILImage

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    PageTemplate,
    Frame,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    PageBreak,
    KeepTogether,
)

# ----------------- Font Configuration -----------------
FONT_NORMAL = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
FONT_ITALIC = "Helvetica-Oblique"

try:
    mp_ttf = os.path.join(matplotlib.get_data_path(), "fonts", "ttf")
    dv_sans = os.path.join(mp_ttf, "DejaVuSans.ttf")
    dv_sans_b = os.path.join(mp_ttf, "DejaVuSans-Bold.ttf")
    dv_sans_i = os.path.join(mp_ttf, "DejaVuSans-Oblique.ttf")
    if os.path.exists(dv_sans) and os.path.exists(dv_sans_b):
        pdfmetrics.registerFont(TTFont("DV", dv_sans))
        pdfmetrics.registerFont(TTFont("DV-B", dv_sans_b))
        if os.path.exists(dv_sans_i):
            pdfmetrics.registerFont(TTFont("DV-I", dv_sans_i))
        else:
            pdfmetrics.registerFont(TTFont("DV-I", dv_sans))
        pdfmetrics.registerFontFamily("DV", normal="DV", bold="DV-B", italic="DV-I", boldItalic="DV-B")
        FONT_NORMAL = "DV"
        FONT_BOLD = "DV-B"
        FONT_ITALIC = "DV-I"
        plt.rcParams["font.family"] = "DejaVu Sans"
except Exception:
    pass

# ----------------- Palette & Styling -----------------
GREEN = colors.HexColor("#1B5E3F")
GREEN_L = colors.HexColor("#E6F2EC")
AMBER = colors.HexColor("#B45309")
AMBER_L = colors.HexColor("#FEF3C7")
RED = colors.HexColor("#B91C1C")
RED_L = colors.HexColor("#FDE8E8")
GREY = colors.HexColor("#4B5563")
GREY_L = colors.HexColor("#F3F4F6")
BORDER_GREY = colors.HexColor("#D1D5DB")

HEX_PALETTE = {
    "g": "#1B5E3F",
    "a": "#B45309",
    "r": "#B91C1C",
    "b": "#2563EB",
    "p": "#7E22CE",
    "gr": "#6B7280",
    "bg": "#F9FAFB",
}

TIER_COLORS = {
    "Validated": "#15803D",
    "Needs expert review": "#B45309",
    "Illustrative model": "#7E22CE",
    "Placeholder assumption": "#C2410C",
    "User input (unverified)": "#374151",
}

def esc(val):
    if val is None:
        return ""
    return _sax_escape(str(val))

def make_style(name, **kwargs):
    base = {
        "fontName": FONT_NORMAL,
        "fontSize": 8.8,
        "leading": 12.4,
        "textColor": colors.HexColor("#111827"),
    }
    base.update(kwargs)
    return ParagraphStyle(name, **base)

body_style = make_style("body")
small_style = make_style("small", fontSize=7.4, leading=10, textColor=GREY)
h1_style = make_style("h1", fontName=FONT_BOLD, fontSize=12, leading=16, textColor=GREEN, spaceBefore=8, spaceAfter=4, keepWithNext=1)
h2_style = make_style("h2", fontName=FONT_BOLD, fontSize=9.5, leading=13, textColor=GREEN, spaceBefore=6, spaceAfter=2, keepWithNext=1)
cell_style = make_style("cell", fontSize=7.6, leading=10)
cell_bold_style = make_style("cellb", fontName=FONT_BOLD, fontSize=7.6, leading=10)
cell_hdr_style = make_style("cellh", fontName=FONT_BOLD, fontSize=7.6, leading=10, textColor=colors.white)
bullet_style = make_style("bullet", leftIndent=10, bulletIndent=0, spaceAfter=2)

def tier_badge(t_name):
    col = TIER_COLORS.get(t_name, "#4B5563")
    return Paragraph(f'<font color="{col}"><b>{esc(t_name)}</b></font>', cell_style)

def create_table(rows, widths, header=True, zebra=True, extra=None):
    t = Table(rows, colWidths=[w * mm for w in widths], repeatRows=1 if header else 0)
    st = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER_GREY),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        st.append(("BACKGROUND", (0, 0), (-1, 0), GREEN))
    if zebra:
        for i in range(1, len(rows)):
            if i % 2 == 0:
                st.append(("BACKGROUND", (0, i), (-1, i), GREY_L))
    if extra:
        st.extend(extra)
    t.setStyle(TableStyle(st))
    return t

def create_callout(paras, bg_color, border_color, width_mm=174):
    t = Table([[paras]], colWidths=[width_mm * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg_color),
        ("BOX", (0, 0), (-1, -1), 1.0, border_color),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t

def fig_to_reportlab_img(fig, w_mm):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=200, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    img = PILImage.open(buf)
    iw, ih = img.size
    buf.seek(0)
    h_mm = w_mm * (ih / iw)
    return Image(buf, width=w_mm * mm, height=h_mm * mm)

def style_matplotlib_axis(ax):
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="y", alpha=0.25, linestyle="--")
    ax.set_axisbelow(True)

# ----------------- Kinetic & Cost Models -----------------
def enzyme_temp_activity(T, t_opt=50, t_spread=30):
    return math.exp(-((T - t_opt) / t_spread) ** 2)

def anti_nutrient_reduction_curve(t, T, dose, k0, spread=0.0):
    k = k0 * dose * enzyme_temp_activity(T) * (1.0 + spread)
    t_arr = np.asarray(t, dtype=float)
    return 100.0 * (1.0 - np.exp(-k * t_arr))

# ----------------- Chart Builders -----------------
def chart_anti_nutrient_kinetics(payload, assumptions):
    kin = assumptions["kinetics"]
    what_if = assumptions["whatIfScenario"]
    t = np.linspace(0, 120, 200)

    fig, axs = plt.subplots(1, 2, figsize=(9, 3.4), sharey=True)
    items = [
        (axs[0], kin["kPhytate"], "Phytate reduction forecast"),
        (axs[1], kin["kTannin"], "Tannin reduction forecast"),
    ]

    for ax, k0, title_text in items:
        # Current plan
        cur = anti_nutrient_reduction_curve(t, payload["temperature"], payload["enzymeDose"], k0)
        cur_lo = anti_nutrient_reduction_curve(t, payload["temperature"], payload["enzymeDose"], k0, -0.35)
        cur_hi = anti_nutrient_reduction_curve(t, payload["temperature"], payload["enzymeDose"], k0, +0.35)

        # What-if scenario
        wf = anti_nutrient_reduction_curve(t, what_if["tempC"], what_if["enzymeDoseUPerG"], k0)
        wf_lo = anti_nutrient_reduction_curve(t, what_if["tempC"], what_if["enzymeDoseUPerG"], k0, -0.35)
        wf_hi = anti_nutrient_reduction_curve(t, what_if["tempC"], what_if["enzymeDoseUPerG"], k0, +0.35)

        ax.fill_between(t, cur_lo, cur_hi, color=HEX_PALETTE["r"], alpha=0.16, label="_nolegend_")
        ax.plot(t, cur, color=HEX_PALETTE["r"], lw=2, label=f"Current plan ({payload['temperature']}°C)")

        ax.fill_between(t, wf_lo, wf_hi, color=HEX_PALETTE["g"], alpha=0.16, label="_nolegend_")
        ax.plot(t, wf, color=HEX_PALETTE["g"], lw=2, label=f"What-if scenario ({what_if['tempC']}°C)")

        # Target marker (illustrative 70%)
        ax.axhline(70, color=HEX_PALETTE["a"], ls=":", lw=1)
        ax.text(118, 72, "Target (illustrative 70%)", fontsize=6.5, color=HEX_PALETTE["a"], ha="right")

        # Planned time line
        ax.axvline(payload["treatmentTime"], color=HEX_PALETTE["gr"], ls="--", lw=1)
        ax.text(payload["treatmentTime"] + 1.5, 92, f"Planned\n{payload['treatmentTime']} min", fontsize=6.5, color=HEX_PALETTE["gr"], va="top")

        ax.set_title(title_text + "\n(ILLUSTRATIVE SIMULATION, placeholder model, not validated)", fontsize=8, fontweight="bold")
        ax.set_xlabel("Treatment time (min)", fontsize=7.5)
        ax.set_ylim(0, 100)
        style_matplotlib_axis(ax)

    axs[0].set_ylabel("Anti-nutrient reduction (%)", fontsize=7.5)
    axs[0].legend(fontsize=7, loc="center right", frameon=False)
    fig.text(0.5, 0.01, "Shaded bands indicate arbitrary sensitivity band (+/-35% reaction rate variation).", ha="center", fontsize=6.5, color=HEX_PALETTE["gr"])
    fig.tight_layout()
    return fig

def chart_off_flavour_profiles(assumptions):
    categories = assumptions["offFlavourCategories"]
    scores = assumptions["offFlavourScores"]

    fig, ax = plt.subplots(figsize=(9, 3.4))
    cols = [HEX_PALETTE["gr"], HEX_PALETTE["r"], HEX_PALETTE["a"], HEX_PALETTE["g"]]
    w = 0.18
    x = np.arange(len(categories))
    n = len(scores)

    for i, (series_name, values) in enumerate(scores.items()):
        offset = (i - (n - 1) / 2) * w
        bars = ax.bar(x + offset, values, w, label=series_name, color=cols[i])
        for b, val in zip(bars, values):
            ax.text(b.get_x() + b.get_width() / 2, val + 0.15, f"{val:.1f}", ha="center", fontsize=6.5)

    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=7.5)
    ax.set_ylim(0, 9.0)
    ax.set_ylabel("Off-flavour intensity (0-10)", fontsize=7.5)
    ax.set_title("Off-Flavour Intensity Forecast\n(ILLUSTRATIVE SIMULATION, placeholder model, not validated)", fontsize=8.5, fontweight="bold")
    ax.legend(fontsize=7, ncol=2, frameon=False, loc="upper right")
    style_matplotlib_axis(ax)
    fig.tight_layout()
    return fig

def chart_corrective_option_costs(assumptions):
    options = assumptions["correctiveOptions"]
    sorted_opts = sorted(options, key=lambda o: o["costInrPerKg"])
    cmap = {
        "Enzyme": HEX_PALETTE["p"],
        "Chemical": HEX_PALETTE["b"],
        "Process": HEX_PALETTE["gr"],
        "Plant-based masker": HEX_PALETTE["g"],
    }

    fig, ax = plt.subplots(figsize=(9, 4.4))
    y = np.arange(len(sorted_opts))
    costs = [o["costInrPerKg"] for o in sorted_opts]
    bar_colors = [cmap.get(o["type"], HEX_PALETTE["gr"]) for o in sorted_opts]

    ax.barh(y, costs, color=bar_colors, height=0.65)
    for yi, c in zip(y, costs):
        ax.text(c + 0.1, yi, f"₹{c:.1f}", va="center", fontsize=7)

    labels = [o["name"] for o in sorted_opts]
    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=7)
    ax.set_xlabel("Illustrative Cost (₹ per kg of cake treated)", fontsize=7.5)
    ax.set_xlim(0, max(costs) * 1.25)
    ax.set_title("Corrective Additive & Enzyme Options\n(ILLUSTRATIVE SIMULATION, placeholder model, not validated)", fontsize=8.5, fontweight="bold")

    from matplotlib.patches import Patch
    legend_handles = [Patch(color=c, label=k) for k, c in cmap.items()]
    ax.legend(handles=legend_handles, fontsize=7, frameon=False, loc="lower right")

    ax.grid(axis="x", alpha=0.25, linestyle="--")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    return fig

def chart_cost_comparison(c_summary):
    fig, axs = plt.subplots(1, 2, figsize=(9, 3.4), gridspec_kw={"width_ratios": [1.2, 1.0]})

    # Stacked bar
    ax = axs[0]
    segments = [
        ("Base cake", c_summary["base_cost"], HEX_PALETTE["gr"]),
        ("Enzymes & process", c_summary["process_cost"] + c_summary["enz_cost"], HEX_PALETTE["p"]),
        ("Taste package", c_summary["taste_cost"], HEX_PALETTE["g"]),
    ]
    bottom = 0
    for label, val, col in segments:
        ax.bar(["Treated cake\n(per kg)"], [val], bottom=bottom, color=col, label=label, width=0.45)
        ax.text(0, bottom + val / 2, f"₹{val:.1f}", ha="center", va="center", color="white", fontsize=7.5, fontweight="bold")
        bottom += val

    ax.text(0, bottom + 1.5, f"Total ₹{bottom:.1f}/kg", ha="center", fontsize=8, fontweight="bold")
    ax.set_ylabel("₹ per kg material", fontsize=7.5)
    ax.set_ylim(0, bottom * 1.45)
    ax.set_title("Cost Components (per kg treated cake)\n(ILLUSTRATIVE SIMULATION, not validated)", fontsize=7.5, fontweight="bold")
    ax.legend(fontsize=7, frameon=False, loc="upper right")
    style_matplotlib_axis(ax)

    # Cost per kg protein comparison
    ax2 = axs[1]
    protein_bars = ["Treated\ngroundnut protein", "Imported\npea isolate"]
    protein_vals = [c_summary["per_kg_protein"], c_summary["pea_per_kg_protein"]]
    err_low = [protein_vals[0] * 0.2, protein_vals[1] * 0.15]
    err_high = [protein_vals[0] * 0.2, protein_vals[1] * 0.15]

    ax2.bar(protein_bars, protein_vals, yerr=[err_low, err_high], capsize=5, color=[HEX_PALETTE["g"], HEX_PALETTE["gr"]], width=0.5)
    for i, val in enumerate(protein_vals):
        ax2.text(i, val * 0.45, f"₹{val:.0f}", ha="center", color="white", fontsize=8.5, fontweight="bold")

    ax2.set_ylabel("₹ per kg protein", fontsize=7.5)
    ax2.set_title("Protein Parity vs Pea Isolate\n(ILLUSTRATIVE SIMULATION, arbitrary sensitivity band)", fontsize=7.5, fontweight="bold")
    style_matplotlib_axis(ax2)

    fig.tight_layout()
    return fig

# ----------------- Main PDF Builder -----------------
def generate_pdf_report(payload, assumptions, out_path):
    report_id = payload.get("reportId") or f"PR-{datetime.datetime.now().strftime('%Y%m%d-%H%M')}"
    today_str = datetime.date.today().strftime("%d %b %Y")
    feedstock = payload.get("feedstock", "Groundnut Cake")
    aflatoxin = payload.get("aflatoxin", "Not tested")

    # Safety gate evaluation
    is_groundnut = (feedstock == "Groundnut Cake")
    aflatoxin_on_file = (aflatoxin or "").strip().lower() == "result on file"
    human_food_gated = is_groundnut and (not aflatoxin_on_file)

    # Cost calculations
    costs_cfg = assumptions["costs"]
    base_cost = costs_cfg["groundnutCakeBaseInrPerKg"]
    process_cost = costs_cfg["treatmentEnergyWaterInrPerKg"]
    options = assumptions["correctiveOptions"]
    pkg_options = [o for o in options if o.get("inPackage", False)]
    enz_cost = sum(o["costInrPerKg"] for o in pkg_options if o["type"] == "Enzyme")
    taste_cost = sum(o["costInrPerKg"] for o in pkg_options if o["type"] != "Enzyme")
    total_cost = base_cost + process_cost + enz_cost + taste_cost

    initial_protein = float(payload.get("initialProtein") or 0.1)
    retention_ratio = costs_cfg["proteinRetentionRatio"]
    effective_protein_kg = max(0.01, (initial_protein / 100.0) * retention_ratio)
    per_kg_protein = total_cost / effective_protein_kg

    pea_inr_kg = costs_cfg["peaIsolateInrPerKg"]
    pea_pct = costs_cfg["peaProteinPct"]
    pea_per_kg_protein = pea_inr_kg / (pea_pct / 100.0)

    cost_summary = {
        "base_cost": base_cost,
        "process_cost": process_cost,
        "enz_cost": enz_cost,
        "taste_cost": taste_cost,
        "total_cost": total_cost,
        "per_kg_protein": per_kg_protein,
        "pea_per_kg_protein": pea_per_kg_protein,
        "package_options": pkg_options,
    }

    # Header / footer decorator
    def page_decorator(canvas, doc_template):
        w, h = A4
        canvas.saveState()
        # Top banner
        canvas.setFillColor(GREEN)
        canvas.rect(0, h - 11 * mm, w, 11 * mm, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont(FONT_BOLD, 9)
        canvas.drawString(18 * mm, h - 7.2 * mm, "ProteinRescue AI")
        canvas.setFont(FONT_NORMAL, 8)
        canvas.drawRightString(w - 18 * mm, h - 7.2 * mm, f"Predictive Treatment Report  |  {report_id}")

        # Bottom rule & disclaimer
        canvas.setStrokeColor(BORDER_GREY)
        canvas.line(18 * mm, 14 * mm, w - 18 * mm, 14 * mm)
        canvas.setFillColor(RED)
        canvas.setFont(FONT_BOLD, 6.8)
        canvas.drawString(18 * mm, 10 * mm, "ILLUSTRATIVE SIMULATION, placeholder model, not validated. Not a laboratory result or food-safety certification.")
        canvas.setFillColor(GREY)
        canvas.setFont(FONT_NORMAL, 7.5)
        canvas.drawRightString(w - 18 * mm, 10 * mm, f"Page {doc_template.page}")
        canvas.restoreState()

    doc = BaseDocTemplate(
        out_path,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title=f"ProteinRescue AI Report - {feedstock}",
        author="ProteinRescue AI",
    )
    doc.report_id = report_id
    doc.addPageTemplates([
        PageTemplate(
            id="report_page",
            frames=[Frame(18 * mm, 18 * mm, 174 * mm, 260 * mm, id="main_frame", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)],
            onPage=page_decorator,
        )
    ])

    elements = []

    # ---------------- 1. Cover / Header Banner ----------------
    title_table = Table(
        [
            [Paragraph('<font color="white" size="18"><b>Predictive Treatment & Simulation Report</b></font>', make_style("t", fontName=FONT_BOLD, leading=22))],
            [Paragraph(f'<font color="#D1FAE5" size="9.5">{esc(feedstock)}  |  Enzymatic treatment, anti-nutrient kinetics & taste simulation</font>', make_style("t2", leading=13))],
        ],
        colWidths=[174 * mm],
    )
    title_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREEN),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (0, 0), 8),
        ("BOTTOMPADDING", (0, 1), (0, 1), 8),
    ]))
    elements.extend([title_table, Spacer(1, 4)])

    # Meta Table
    aflatoxin_display = f'<font color="#B91C1C"><b>{esc(aflatoxin)}</b></font>' if human_food_gated else esc(aflatoxin or "N/A")
    meta_rows = [
        [Paragraph("<b>Report ID</b>", cell_style), Paragraph(esc(report_id), cell_style), Paragraph("<b>Date</b>", cell_style), Paragraph(esc(today_str), cell_style)],
        [Paragraph("<b>Feedstock</b>", cell_style), Paragraph(esc(feedstock), cell_style), Paragraph("<b>Simulation Status</b>", cell_style), Paragraph("Unvalidated AI Model", cell_style)],
        [Paragraph("<b>Aflatoxin Status</b>", cell_style), Paragraph(aflatoxin_display, cell_style), Paragraph("<b>Prepared By</b>", cell_style), Paragraph("ProteinRescue AI Platform", cell_style)],
    ]
    meta_table = create_table(meta_rows, [32, 55, 32, 55], header=False, zebra=False, extra=[
        ("BACKGROUND", (0, 0), (0, -1), GREEN_L),
        ("BACKGROUND", (2, 0), (2, -1), GREEN_L),
    ])
    elements.extend([meta_table, Spacer(1, 5)])

    # Primary Safety Notice
    elements.append(create_callout([
        Paragraph("<b>MANDATORY NOTICE:</b> Illustrative simulation and unvalidated AI estimate only. Not a laboratory result, not scientifically validated, and not a food-safety or regulatory determination.", make_style("not", fontName=FONT_BOLD, textColor=AMBER, fontSize=8.2, leading=11)),
    ], AMBER_L, AMBER))
    elements.append(Spacer(1, 5))

    # Aflatoxin Gate Callout
    if is_groundnut:
        if human_food_gated:
            elements.append(create_callout([
                Paragraph('<font color="#B91C1C" size="10"><b>[X] HUMAN FOOD ROUTE GATED (SAFETY CRITICAL)</b></font>', make_style("g1", fontName=FONT_BOLD, leading=14)),
                Spacer(1, 2),
                Paragraph("Groundnut Cake cannot be routed to human food applications without verified aflatoxin test results on file.", body_style),
                Spacer(1, 2),
                Paragraph("<b>Mandatory Gate:</b> An aflatoxin test is required first. Until verified lab results are on file, the material should not be considered for any human consumption route. A qualified analytical laboratory and food safety specialist must review any aflatoxin test result against regulatory thresholds.", body_style),
            ], RED_L, RED))
        else:
            elements.append(create_callout([
                Paragraph('<font color="#15803D" size="10"><b>[!] Aflatoxin Result On File — Formal Laboratory Verification Required</b></font>', make_style("g2", fontName=FONT_BOLD, leading=14)),
                Spacer(1, 2),
                Paragraph("Aflatoxin test status is recorded as on file. This software simulation does NOT certify or evaluate the safety of the material. A qualified analytical laboratory and food safety professional must independently review certified assay results against statutory limits (e.g., FSSAI thresholds) prior to food-grade approval.", body_style),
            ], GREEN_L, GREEN))
        elements.append(Spacer(1, 5))

    # ---------------- 2. Summary Section ----------------
    elements.append(Paragraph("1. Executive Summary", h1_style))
    summary_text = (
        f"Processing parameters specified for <b>{esc(feedstock)}</b>: treatment temperature of <b>{payload['temperature']}°C</b>, "
        f"treatment duration of <b>{payload['treatmentTime']} minutes</b>, and enzyme dose of <b>{payload['enzymeDose']} U/g</b>. "
        f"The feedstock reports an initial protein content of <b>{payload['initialProtein']}%</b>, phytate level of <b>{payload['phytate']} mg/g</b>, "
        f"and tannin level of <b>{payload['tannin']} mg/g</b>. "
    )
    if is_groundnut:
        if human_food_gated:
            summary_text += "Aflatoxin testing is missing or pending; human-food utilization routes remain strictly locked."
        else:
            summary_text += "Aflatoxin result is recorded on file; independent certified laboratory review against regulatory thresholds is required."
    else:
        summary_text += "Standard non-groundnut analytical testing protocols apply for anti-nutrient and protein validation."

    elements.append(Paragraph(summary_text, body_style))
    elements.append(Spacer(1, 4))

    # Kinetic KPI Preview
    kin = assumptions["kinetics"]
    what_if = assumptions["whatIfScenario"]
    ph_cur = anti_nutrient_reduction_curve([payload["treatmentTime"]], payload["temperature"], payload["enzymeDose"], kin["kPhytate"])[0]
    tn_cur = anti_nutrient_reduction_curve([payload["treatmentTime"]], payload["temperature"], payload["enzymeDose"], kin["kTannin"])[0]
    ph_wf = anti_nutrient_reduction_curve([what_if["timeMin"]], what_if["tempC"], what_if["enzymeDoseUPerG"], kin["kPhytate"])[0]
    tn_wf = anti_nutrient_reduction_curve([what_if["timeMin"]], what_if["tempC"], what_if["enzymeDoseUPerG"], kin["kTannin"])[0]

    def kpi_box(val_str, label_str, col_hex):
        return [
            Paragraph(f'<font color="{col_hex}" size="13"><b>{esc(val_str)}</b></font>', make_style("k_val", fontName=FONT_BOLD, alignment=TA_CENTER, leading=16)),
            Paragraph(label_str, make_style("k_lbl", alignment=TA_CENTER, fontSize=6.8, leading=9, textColor=GREY)),
        ]

    kpi_table = Table(
        [[
            kpi_box(f"{ph_cur:.0f}%", "Phytate reduction<br/>(current plan)", "#B91C1C"),
            kpi_box(f"{tn_cur:.0f}%", "Tannin reduction<br/>(current plan)", "#B91C1C"),
            kpi_box(f"{ph_wf:.0f}% / {tn_wf:.0f}%", "Phytate / tannin<br/>(what-if scenario)", "#1B5E3F"),
            kpi_box(f"₹{total_cost:.0f}/kg", "Treated + taste package<br/>(illustrative estimate)", "#1B5E3F"),
        ]],
        colWidths=[43.5 * mm] * 4,
    )
    kpi_table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER_GREY),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E5E7EB")),
        ("BACKGROUND", (0, 0), (-1, -1), GREEN_L),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.extend([kpi_table, Spacer(1, 2)])
    elements.append(Paragraph("All figures are Illustrative Model outputs shown as single points; empirical results are ranges with assay uncertainty.", small_style))
    elements.append(Spacer(1, 4))

    # ---------------- 3. Input Parameters Table ----------------
    elements.append(Paragraph("2. Input Parameters and Evidence Baseline", h1_style))
    input_rows = [
        [Paragraph("<b>Parameter</b>", cell_hdr_style), Paragraph("<b>Value</b>", cell_hdr_style), Paragraph("<b>Evidence Tier</b>", cell_hdr_style), Paragraph("<b>Note</b>", cell_hdr_style)],
        [Paragraph("Treatment temperature", cell_style), Paragraph(f"{payload['temperature']} °C", cell_style), tier_badge("User input (unverified)"), Paragraph("User-specified operational setpoint", cell_style)],
        [Paragraph("Treatment time", cell_style), Paragraph(f"{payload['treatmentTime']} min", cell_style), tier_badge("User input (unverified)"), Paragraph("User-specified incubation duration", cell_style)],
        [Paragraph("Enzyme dose", cell_style), Paragraph(f"{payload['enzymeDose']} U/g", cell_style), tier_badge("User input (unverified)"), Paragraph("Enzyme activity per gram dry matter", cell_style)],
        [Paragraph("Initial protein", cell_style), Paragraph(f"{payload['initialProtein']} %", cell_style), tier_badge("User input (unverified)"), Paragraph("Feedstock protein concentration", cell_style)],
        [Paragraph("Phytate", cell_style), Paragraph(f"{payload['phytate']} mg/g", cell_style), tier_badge("User input (unverified)"), Paragraph("Anti-nutrient baseline", cell_style)],
        [Paragraph("Tannin", cell_style), Paragraph(f"{payload['tannin']} mg/g", cell_style), tier_badge("User input (unverified)"), Paragraph("Polyphenolic anti-nutrient baseline", cell_style)],
        [Paragraph("Aflatoxin status", cell_style), Paragraph(esc(aflatoxin or "N/A"), cell_style), tier_badge("User input (unverified)"), Paragraph("Safety gating requirement for groundnut", cell_style)],
    ]
    elements.append(create_table(input_rows, [40, 26, 36, 72]))
    elements.append(Spacer(1, 4))

    # Parameter sanity checks
    param_checks = [Paragraph("<b>Operational Setpoint Observations</b>", make_style("ch_hdr", fontName=FONT_BOLD, textColor=AMBER, fontSize=8))]
    if payload["temperature"] < 30:
        param_checks.append(Paragraph("• Treatment temperature is below standard enzyme activation range (40–55°C); expected kinetic rates will be substantially suppressed.", bullet_style))
    if payload["initialProtein"] < 30 and is_groundnut:
        param_checks.append(Paragraph("• Initial protein is lower than typical groundnut meal literature values (often 40–50%); re-verify analytical entry.", bullet_style))
    if payload["phytate"] < 5:
        param_checks.append(Paragraph("• Phytate level is unusually low for raw oilseed cake; confirm analytical units (mg/g vs g/100g).", bullet_style))
    param_checks.append(Paragraph("• Model Confidence: <b>Low</b>. Predictions are extrapolated from literature kinetics without empirical calibration on this specific feedstock lot.", bullet_style))
    elements.append(create_callout(param_checks, AMBER_L, AMBER))

    # ---------------- 4. Trajectory Section ----------------
    elements.append(PageBreak())
    elements.append(Paragraph("3. Treatment Trajectory Forecast", h1_style))
    elements.append(Paragraph(
        "Computational simulation of anti-nutrient degradation over reaction time. Shaded areas represent an arbitrary sensitivity band (+/-35% rate variation). "
        "The red trajectory represents the user-specified current plan; the green trajectory illustrates an alternate what-if scenario.",
        body_style,
    ))
    elements.append(Spacer(1, 2))
    elements.append(fig_to_reportlab_img(chart_anti_nutrient_kinetics(payload, assumptions), 174))
    elements.append(Spacer(1, 3))

    trajectory_rows = [
        [Paragraph("<b>Metric</b>", cell_hdr_style), Paragraph("<b>Current Plan</b>", cell_hdr_style), Paragraph("<b>What-If Scenario</b>", cell_hdr_style), Paragraph("<b>Evidence Tier</b>", cell_hdr_style)],
        [
            Paragraph("Parameters (T / t / dose)", cell_style),
            Paragraph(f"{payload['temperature']}°C / {payload['treatmentTime']} min / {payload['enzymeDose']} U/g", cell_style),
            Paragraph(f"{what_if['tempC']}°C / {what_if['timeMin']} min / {what_if['enzymeDoseUPerG']} U/g", cell_style),
            tier_badge("Illustrative model"),
        ],
        [
            Paragraph("Phytate reduction (range)", cell_style),
            Paragraph(f"{ph_cur:.0f}% ({ph_cur*0.65:.0f}–{min(99, ph_cur*1.35):.0f}%)", cell_style),
            Paragraph(f"{ph_wf:.0f}% ({ph_wf*0.65:.0f}–{min(99, ph_wf*1.35):.0f}%)", cell_style),
            tier_badge("Illustrative model"),
        ],
        [
            Paragraph("Tannin reduction (range)", cell_style),
            Paragraph(f"{tn_cur:.0f}% ({tn_cur*0.65:.0f}–{min(99, tn_cur*1.35):.0f}%)", cell_style),
            Paragraph(f"{tn_wf:.0f}% ({tn_wf*0.65:.0f}–{min(99, tn_wf*1.35):.0f}%)", cell_style),
            tier_badge("Illustrative model"),
        ],
        [
            Paragraph("Protein retention (est.)", cell_style),
            Paragraph("98.0–99.5 %", cell_style),
            Paragraph("94.0–98.0 %", cell_style),
            tier_badge("Illustrative model"),
        ],
        [
            Paragraph("Bitter peptide risk", cell_style),
            Paragraph("Low (short duration)", cell_style),
            Paragraph("Medium (extended incubation; side protease)", cell_style),
            tier_badge("Needs expert review"),
        ],
    ]
    elements.append(create_table(trajectory_rows, [44, 44, 62, 24]))
    elements.append(Spacer(1, 5))

    # ---------------- 5. Taste & Off-Flavour Module ----------------
    elements.append(Paragraph("4. Taste and Off-Flavour Analysis", h1_style))

    if not is_groundnut:
        # Template pending expert review for Guar Meal and Rice Bran
        elements.append(create_callout([
            Paragraph(f'<font color="#B45309" size="9.5"><b>Template Pending Expert Review: {esc(feedstock)}</b></font>', make_style("rev_hdr", fontName=FONT_BOLD, leading=13)),
            Spacer(1, 2),
            Paragraph(
                f"Biochemical off-flavour compound mappings, degradation kinetics, and corrective taste packages for <b>{esc(feedstock)}</b> are currently undergoing specialist scientific review and experimental calibration. "
                "The specific anti-nutrients (e.g., galactomannans in guar, or rancidity kinetics and lipase activity in stabilized rice bran) require bespoke kinetic parameters that are not yet validated. "
                "Consult an analytical laboratory and food formulation specialist for tailored debittering protocols.",
                body_style,
            ),
        ], AMBER_L, AMBER))
        elements.append(Spacer(1, 5))
    else:
        # Full groundnut template
        elements.append(Paragraph(
            "Bitter, beany, and astringent notes frequently impede the upcycling of oilseed press-cakes into food applications. "
            "Enzymatic hydrolysis itself can generate bitter peptides if non-specific proteases are present in the enzyme cocktail.",
            body_style,
        ))
        elements.append(Spacer(1, 2))
        elements.append(Paragraph("4.1 Biochemical Mechanisms of Off-Flavours", h2_style))

        causes = assumptions["causes"]
        cause_rows = [
            [Paragraph("<b>Compound</b>", cell_hdr_style), Paragraph("<b>Origin</b>", cell_hdr_style), Paragraph("<b>Mechanism</b>", cell_hdr_style), Paragraph("<b>Taste</b>", cell_hdr_style), Paragraph("<b>Level</b>", cell_hdr_style), Paragraph("<b>Tier</b>", cell_hdr_style)],
        ]
        for c in causes:
            cause_rows.append([
                Paragraph(f"<b>{esc(c['compound'])}</b>", cell_style),
                Paragraph(esc(c["origin"]), cell_style),
                Paragraph(esc(c["mechanism"]), cell_style),
                Paragraph(esc(c["taste"]), cell_style),
                Paragraph(esc(c["level"]), cell_style),
                tier_badge(c["tier"]),
            ])
        elements.append(create_table(cause_rows, [28, 22, 60, 20, 16, 28]))
        elements.append(Spacer(1, 3))

        elements.append(Paragraph("4.2 Predicted Off-Flavour Intensity Profiles", h2_style))
        elements.append(fig_to_reportlab_img(chart_off_flavour_profiles(assumptions), 174))
        elements.append(Paragraph("Intensity scale 0–10. Illustrative simulation output based on placeholder qualitative models. Empirical confirmation requires sensory panel or electronic tongue validation.", small_style))
        elements.append(Spacer(1, 4))

        # Corrective options
        elements.append(Paragraph("4.3 Corrective Additive & Enzyme Options", h2_style))
        opt_rows = [
            [Paragraph("<b>Name</b>", cell_hdr_style), Paragraph("<b>Type</b>", cell_hdr_style), Paragraph("<b>Action</b>", cell_hdr_style), Paragraph("<b>Typical Dose</b>", cell_hdr_style), Paragraph("<b>₹/kg</b>", cell_hdr_style), Paragraph("<b>In Pkg</b>", cell_hdr_style)],
        ]
        pkg_indices = []
        for idx, o in enumerate(options):
            in_pkg = o.get("inPackage", False)
            if in_pkg:
                pkg_indices.append(idx + 1)
            opt_rows.append([
                Paragraph(f"<b>{esc(o['name'])}</b>", cell_style),
                Paragraph(esc(o["type"]), cell_style),
                Paragraph(esc(o["fixes"]), cell_style),
                Paragraph(esc(o["typicalDose"]), cell_style),
                Paragraph(f"{o['costInrPerKg']:.1f}", cell_style),
                Paragraph("YES" if in_pkg else "-", cell_style),
            ])
        elements.append(create_table(opt_rows, [34, 22, 58, 24, 16, 20], extra=[
            ("BACKGROUND", (0, i), (-1, i), GREEN_L) for i in pkg_indices
        ]))
        elements.append(Spacer(1, 2))
        elements.append(Paragraph("Costs and doses are Placeholder Assumptions. Verification with commercial suppliers and pilot bench runs is essential.", small_style))
        elements.append(Spacer(1, 4))
        elements.append(fig_to_reportlab_img(chart_corrective_option_costs(assumptions), 174))

    # ---------------- 6. Cost Section ----------------
    elements.append(PageBreak())
    elements.append(Paragraph("5. Economic Assessment & Protein Parity", h1_style))

    if not is_groundnut:
        elements.append(create_callout([
            Paragraph(f'<font color="#B45309" size="9.5"><b>Economic Model Pending Expert Review: {esc(feedstock)}</b></font>', make_style("cost_rev", fontName=FONT_BOLD, leading=13)),
            Spacer(1, 2),
            Paragraph(
                f"Commercial baseline prices and processing utility models for <b>{esc(feedstock)}</b> are currently undergoing regional cost benchmarking. "
                "Detailed cost models will be activated upon publication of calibrated economic assumptions.",
                body_style,
            ),
        ], AMBER_L, AMBER))
        elements.append(Spacer(1, 5))
    else:
        pkg_names = ", ".join(o["name"].split(" (")[0] for o in cost_summary["package_options"])
        elements.append(Paragraph(f"<b>Illustrative Taste Package Composition:</b> {esc(pkg_names)}.", body_style))
        elements.append(Spacer(1, 2))

        cost_rows = [
            [Paragraph("<b>Cost Component</b>", cell_hdr_style), Paragraph("<b>₹ per kg</b>", cell_hdr_style), Paragraph("<b>Evidence Tier</b>", cell_hdr_style)],
            [Paragraph("Base groundnut cake raw material", cell_style), Paragraph(f"₹{cost_summary['base_cost']:.1f}", cell_style), tier_badge("Placeholder assumption")],
            [Paragraph("Treatment thermal energy and water", cell_style), Paragraph(f"₹{cost_summary['process_cost']:.1f}", cell_style), tier_badge("Placeholder assumption")],
            [Paragraph("Enzyme cocktail (phytase, tannase, aminopeptidase)", cell_style), Paragraph(f"₹{cost_summary['enz_cost']:.1f}", cell_style), tier_badge("Placeholder assumption")],
            [Paragraph("Taste-masking ingredients (citric acid, salt, date paste, carob)", cell_style), Paragraph(f"₹{cost_summary['taste_cost']:.1f}", cell_style), tier_badge("Placeholder assumption")],
            [Paragraph("<b>Total Treated & Taste-Improved Flour</b>", cell_bold_style), Paragraph(f"<b>₹{cost_summary['total_cost']:.1f}</b>", cell_bold_style), tier_badge("Illustrative model")],
            [Paragraph(f"<b>Effective cost per kg protein ({retention_ratio*100:.0f}% retention)</b>", cell_bold_style), Paragraph(f"<b>₹{cost_summary['per_kg_protein']:.0f}</b>", cell_bold_style), tier_badge("Illustrative model")],
            [Paragraph(f"Imported pea isolate benchmark (₹{pea_inr_kg:.0f}/kg at {pea_pct:.0f}% protein)", cell_style), Paragraph(f"₹{cost_summary['pea_per_kg_protein']:.0f}", cell_style), tier_badge("Placeholder assumption")],
        ]
        elements.append(create_table(cost_rows, [110, 30, 34], extra=[
            ("BACKGROUND", (0, 5), (-1, 6), GREEN_L),
        ]))
        elements.append(Spacer(1, 3))
        elements.append(fig_to_reportlab_img(chart_cost_comparison(cost_summary), 174))
        elements.append(Paragraph("Economic comparison is an unvalidated computational planning estimate. It does NOT imply food safety or regulatory eligibility (see safety gate).", small_style))
        elements.append(Spacer(1, 5))

    # ---------------- 7. Qualitative Sections & Evidence Tiers ----------------
    elements.append(Paragraph("6. Utilization Route Evaluation", h1_style))
    if is_groundnut and human_food_gated:
        elements.append(create_callout([
            Paragraph('<font color="#B91C1C"><b>[X] Human Food Route Locked: Aflatoxin Verification Missing</b></font>', make_style("rt_lck", fontName=FONT_BOLD, leading=13)),
            Spacer(1, 2),
            Paragraph(
                "Material must never be presented, routed, or commercialized for human consumption without certified aflatoxin test results on file. "
                "An aflatoxin test is required first. Until an analytical result is on file, the material must remain restricted. "
                "A qualified laboratory and food safety specialist must review any aflatoxin test result against regulatory thresholds. "
                "Taste improvement simulations are purely hypothetical and provide zero indication of material safety or edible quality.",
                body_style,
            ),
        ], RED_L, RED))
    elif is_groundnut and not human_food_gated:
        elements.append(create_callout([
            Paragraph('<font color="#15803D"><b>[!] Human Food Route Subject to Independent Verification</b></font>', make_style("rt_ok", fontName=FONT_BOLD, leading=13)),
            Spacer(1, 2),
            Paragraph(
                "Aflatoxin documentation is recorded as on file. Prior to routing into human food products, batch-specific analytical certificates of analysis (COA) "
                "must be formally cross-referenced against regional food authority limits (e.g. FSSAI / Codex Alimentarius). "
                "Enzymatic treatment and debittering formulations must comply with permitted food additives and food enzyme regulations.",
                body_style,
            ),
        ], GREEN_L, GREEN))
    else:
        elements.append(Paragraph(
            f"For <b>{esc(feedstock)}</b>, assess anti-nutritional factors (phytates, tannins, or glucosinolates) alongside microbiological quality. "
            "Ensure adherence to food-grade processing and safety requirements prior to human food consideration.",
            body_style,
        ))
    elements.append(Spacer(1, 4))

    elements.append(Paragraph("7. Processing Considerations", h1_style))
    considerations = [
        "Biochemical markers including protein content, phytate, and tannin levels suggest potential qualitative trends in processing response.",
        "Treatment temperature, incubation duration, and enzyme dose constitute interactive variables that determine both hydrolysis kinetics and thermal protein denaturation.",
        "Extended enzymatic processing may stimulate bitter-peptide generation; debittering exopeptidases and botanical masking packages must be formulated synchronously.",
    ]
    for c_text in considerations:
        elements.append(Paragraph(f"• {c_text}", bullet_style))
    elements.append(Spacer(1, 3))

    elements.append(Paragraph("8. Recommended Analytical Tests", h1_style))
    tests = [
        "Perform certified high-performance liquid chromatography (HPLC) or ELISA assay for aflatoxins (B1, B2, G1, G2).",
        "Empirically measure nitrogen solubility index (NSI) and protein dispersibility index (PDI) post-treatment to verify functional protein retention.",
        "Conduct quantitative spectrophotometric assays for residual phytate and condensed tannins.",
        "Execute trained sensory panel evaluation and GC-MS volatile headspace screening for lipid autoxidation aldehydes.",
        "Obtain formal supplier quotations for commercial food-grade enzyme and masker formulations.",
    ]
    for t_text in tests:
        elements.append(Paragraph(f"• {t_text}", bullet_style))
    elements.append(Spacer(1, 4))

    elements.append(Paragraph("9. Scientific Evidence Tiers & Governance", h1_style))
    tier_defs = assumptions["evidenceTiers"]
    tier_rows = [
        [Paragraph("<b>Tier</b>", cell_hdr_style), Paragraph("<b>Definition & Scientific Criteria</b>", cell_hdr_style)],
    ]
    for td in tier_defs:
        tier_rows.append([
            tier_badge(td["tier"]),
            Paragraph(esc(td["description"]), cell_style),
        ])
    elements.append(create_table(tier_rows, [44, 130]))
    elements.append(Spacer(1, 5))

    elements.append(create_callout([
        Paragraph("<b>MANDATORY DISCLAIMER:</b> Illustrative simulation and unvalidated AI estimate only. Not a laboratory result, not scientifically validated, and not a food-safety or regulatory determination. ProteinRescue AI disclaims all liability for actions taken based on computational forecasts without certified empirical analytical validation.", make_style("fin_disc", fontName=FONT_BOLD, textColor=RED, fontSize=8, leading=11)),
    ], RED_L, RED))

    doc.build(elements)

def main():
    if len(sys.argv) < 2:
        print("Usage: python generator.py <out_pdf_path>", file=sys.stderr)
        sys.exit(1)

    out_path = sys.argv[1]
    input_text = sys.stdin.read()
    if not input_text or not input_text.strip():
        print("Error: Empty JSON input over stdin", file=sys.stderr)
        sys.exit(1)

    try:
        payload = json.loads(input_text)
    except Exception as e:
        print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)

    # Load assumptions.json
    script_dir = os.path.dirname(os.path.abspath(__file__))
    assumptions_path = os.path.join(script_dir, "assumptions.json")
    with open(assumptions_path, "r", encoding="utf-8") as f:
        assumptions = json.load(f)

    generate_pdf_report(payload, assumptions, out_path)
    print(f"Report generated successfully: {out_path}")

if __name__ == "__main__":
    main()
