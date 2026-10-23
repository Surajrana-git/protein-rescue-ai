bplist00ÑXUTI-DataÑ_public.utf8-plain-text_yª"""
ProteinRescue AI - Report generator
Usage: python generate_report.py   (builds sample report for Groundnut Cake)
In production: call build_report(data, "out.pdf") from your Lambda with real inputs.
ALL numbers are illustrative simulation values. Verify with papers / lab data.
"""
import math, io, datetime
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, Image, PageBreak, KeepTogether)

FD = "/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("DV", FD + "DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DV-B", FD + "DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("DV-I", FD + "DejaVuSans-Oblique.ttf"))
pdfmetrics.registerFontFamily("DV", normal="DV", bold="DV-B", italic="DV-I", boldItalic="DV-B")
plt.rcParams["font.family"] = "DejaVu Sans"

# ---------- palette ----------
GREEN = colors.HexColor("#1B5E3F"); GREEN_L = colors.HexColor("#E6F2EC")
AMBER = colors.HexColor("#B45309"); AMBER_L = colors.HexColor("#FEF3C7")
RED = colors.HexColor("#B91C1C"); RED_L = colors.HexColor("#FDE8E8")
GREY = colors.HexColor("#4B5563"); GREY_L = colors.HexColor("#F3F4F6")
TIER = {"Validated": "#15803D", "Published": "#1D4ED8", "Model": "#7E22CE",
        "Assumption": "#C2410C", "User input": "#374151"}
HEX = dict(g="#1B5E3F", a="#D97706", r="#B91C1C", b="#2563EB", p="#7E22CE", gr="#6B7280")

# ---------- sample input data (Groundnut cake from team's example) ----------
DATA = {
    "report_id": "PR-GC-0001",
    "byproduct": "Groundnut Cake",
    "temp_c": 11, "time_min": 12, "enzyme_u_per_g": 12,
    "protein_pct": 12, "phytate_mg_g": 1, "tannin_mg_g": 12,
    "aflatoxin_result": None,          # None = not tested / not verified
    "base_cost_inr_kg": 35.0,          # Assumption (editable)
    "pea_isolate_inr_kg": 450.0, "pea_protein_pct": 80.0,   # Assumption (editable)
}

# ---------- simple illustrative kinetic model ----------
def act(T):  # enzyme activity vs temperature (bell curve, optimum ~50 C)
    return math.exp(-((T - 50) / 30) ** 2)

def red_curve(t, T, dose, k0, spread=0.0):
    k = k0 * dose * act(T) * (1 + spread)
    return 100 * (1 - np.exp(-k * np.asarray(t, dtype=float)))

K_PHY, K_TAN = 0.0015, 0.0008
SUGGEST = dict(temp_c=45, time_min=90, enzyme_u_per_g=12)

# ---------- off-flavour model (0-10 index, illustrative) ----------
FLAV_CATS = ["Bitter", "Beany / grassy", "Astringent", "Earthy / rancid"]
FLAV = {
    "Raw by-product":                    [6.5, 5.0, 7.0, 4.0],
    "After current treatment":           [6.3, 4.9, 6.8, 3.9],
    "After suggested treatment only":    [7.0, 4.5, 4.0, 3.8],
    "Suggested treatment + taste package": [3.0, 2.5, 2.5, 2.5],
}

# ---------- knowledge tables ----------
CAUSES = [
    ("Bitter peptides", "Enzyme by-product",
     "Proteases (also side-activity in crude enzyme mixes) cut protein and release small hydrophobic peptides (Leu, Phe, Tyr, Trp ends).",
     "Bitter", "High", "Published"),
    ("Hexanal, 2-pentylfuran, 1-hexanol", "Enzyme by-product",
     "Lipoxygenase acts on residual oil (linoleic acid) and creates aldehydes / alcohols: the beany, green or grassy note.",
     "Beany / grassy", "Medium", "Published"),
    ("Free fatty acids, nonanal", "Enzyme / oxidation by-product",
     "Lipase splits residual oil, then oxidation gives rancid, stale notes. Worse in humid storage.",
     "Rancid / earthy", "Medium", "Published"),
    ("Tannins (polyphenols)", "Natural anti-nutrient",
     "Bind saliva proteins, so mouth feels dry and rough. Tannin is high in this batch (12 mg/g).",
     "Astringent", "High", "Published"),
    ("Saponins", "Natural anti-nutrient",
     "Soapy, lingering bitter taste; may foam in water-based products.",
     "Bitter / soapy", "Low-Med", "Published"),
    ("Phytate", "Natural anti-nutrient",
     "Almost no taste itself, but locks minerals (Fe, Zn, Ca) and gives chalky mouthfeel at high levels.",
     "Chalky (indirect)", "Low", "Published"),
]

# name, type, target, dose, cost INR per kg cake, plant-based?, tier, in_package
OPTIONS = [
    ("Phytase", "Enzyme", "Phytate break-down, mineral release", "0.05-0.2 g / kg", 0.8, "Microbial (no animal)", "Assumption", True),
    ("Tannase", "Enzyme", "Tannin: astringency down", "0.1-0.3 g / kg", 1.2, "Microbial (no animal)", "Assumption", True),
    ("Laccase / polyphenol oxidase", "Enzyme", "Polyphenols (may darken colour)", "0.05-0.2 g / kg", 1.5, "Microbial / fungal", "Assumption", False),
    ("Aminopeptidase / exopeptidase (debittering)", "Enzyme", "Bitter peptides: trims hydrophobic ends", "0.2-0.5 g / kg", 2.5, "Microbial (no animal)", "Assumption", True),
    ("Heat blanch + low pH (lipoxygenase control)", "Process", "Beany aldehydes: stops formation", "80-90 C, 5-10 min", 0.3, "Yes", "Model", False),
    ("Citric acid (pH adjust)", "Chemical", "Reduces bitterness perception, helps enzymes", "0.2-0.5 %", 0.2, "Yes (fermentation derived)", "Assumption", True),
    ("Sodium chloride (salt)", "Chemical", "Suppresses bitter taste signal", "0.3-0.8 %", 0.1, "Yes", "Published", True),
    ("Beta-cyclodextrin", "Chemical", "Traps bitter / beany molecules", "0.5-1.5 %", 6.0, "Starch derived", "Assumption", False),
    ("Ethanol-water wash", "Process", "Removes saponins + volatile beany notes", "40-60 % ethanol", 4.0, "Yes (solvent recovery needed)", "Assumption", False),
    ("Date paste", "Plant-based masker", "Natural sweetness covers bitterness", "3-6 %", 3.0, "Yes", "Assumption", True),
    ("Jaggery", "Plant-based masker", "Sweet, caramel notes mask earthy taste", "2-4 %", 1.5, "Yes", "Assumption", False),
    ("Roasted cocoa / carob powder", "Plant-based masker", "Strong roast flavour hides bitter + beany", "2-5 %", 5.0, "Yes", "Assumption", True),
    ("Coconut milk powder", "Plant-based masker", "Fat + creaminess round off rough taste", "3-8 %", 4.0, "Yes", "Assumption", False),
    ("Yeast extract", "Plant-based masker", "Umami / savoury note masks bitterness", "0.5-1.5 %", 3.5, "Yes (yeast)", "Assumption", False),
    ("Roasted cumin-coriander blend", "Plant-based masker", "Spice notes for savoury products", "0.5-1 %", 2.0, "Yes", "Assumption", False),
]
TREAT_COST = 2.0   # INR/kg: energy + water, Assumption


# ---------- charts ----------
def fig_to_img(fig, w_mm, h_mm):
    buf = io.BytesIO(); fig.savefig(buf, format="png", dpi=200, bbox_inches="tight"); plt.close(fig)
    buf.seek(0)
    from PIL import Image as PI
    iw, ih = PI.open(buf).size; buf.seek(0)
    return Image(buf, width=w_mm * mm, height=w_mm * mm * ih / iw)

def style_ax(ax):
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", alpha=.25); ax.set_axisbelow(True)

def chart_trajectory(d):
    t = np.linspace(0, 120, 200)
    fig, axs = plt.subplots(1, 2, figsize=(9, 3.3), sharey=True)
    for ax, k0, name in [(axs[0], K_PHY, "Phytate reduction"), (axs[1], K_TAN, "Tannin reduction")]:
        cur = red_curve(t, d["temp_c"], d["enzyme_u_per_g"], k0)
        lo = red_curve(t, d["temp_c"], d["enzyme_u_per_g"], k0, -.35)
        hi = red_curve(t, d["temp_c"], d["enzyme_u_per_g"], k0, +.35)
        sg = red_curve(t, SUGGEST["temp_c"], SUGGEST["enzyme_u_per_g"], k0)
        sgl = red_curve(t, SUGGEST["temp_c"], SUGGEST["enzyme_u_per_g"], k0, -.35)
        sgh = red_curve(t, SUGGEST["temp_c"], SUGGEST["enzyme_u_per_g"], k0, +.35)
        ax.fill_between(t, lo, hi, color=HEX["r"], alpha=.18)
        ax.plot(t, cur, color=HEX["r"], lw=2, label=f"Current plan ({d['temp_c']} C)")
        ax.fill_between(t, sgl, sgh, color=HEX["g"], alpha=.18)
        ax.plot(t, sg, color=HEX["g"], lw=2, label=f"Suggested ({SUGGEST['temp_c']} C)")
        ax.axvline(d["time_min"], color=HEX["gr"], ls="--", lw=1)
        ax.text(d["time_min"] + 1.5, 92, f"planned\n{d['time_min']} min", fontsize=7, color=HEX["gr"], va="top")
        ax.axhline(70, color=HEX["a"], ls=":", lw=1)
        ax.text(119, 72, "target 70 %", fontsize=7, color=HEX["a"], ha="right")
        ax.set_title(name, fontsize=10, fontweight="bold"); ax.set_xlabel("Treatment time (min)")
        ax.set_ylim(0, 100); style_ax(ax)
    axs[0].set_ylabel("Reduction (%)"); axs[0].legend(fontsize=7.5, loc="center right", frameon=False)
    fig.tight_layout()
    return fig

def chart_flavour():
    fig, ax = plt.subplots(figsize=(9, 3.4))
    cols = [HEX["gr"], HEX["r"], HEX["a"], HEX["g"]]
    n = len(FLAV); w = .2; x = np.arange(len(FLAV_CATS))
    for i, (k, v) in enumerate(FLAV.items()):
        bars = ax.bar(x + (i - (n - 1) / 2) * w, v, w, label=k, color=cols[i])
        for b, val in zip(bars, v):
            ax.text(b.get_x() + b.get_width() / 2, val + .12, f"{val:.1f}", ha="center", fontsize=7)
    ax.set_xticks(x); ax.set_xticklabels(FLAV_CATS); ax.set_ylim(0, 8.6)
    ax.set_ylabel("Off-flavour intensity (0-10)")
    ax.legend(fontsize=7.5, ncol=2, frameon=False, loc="upper right")
    style_ax(ax); fig.tight_layout(); return fig

def chart_option_costs():
    items = sorted(OPTIONS, key=lambda o: o[4])
    cmap = {"Enzyme": HEX["p"], "Chemical": HEX["b"], "Process": HEX["gr"], "Plant-based masker": HEX["g"]}
    fig, ax = plt.subplots(figsize=(9, 4.6))
    y = np.arange(len(items))
    ax.barh(y, [o[4] for o in items], color=[cmap[o[1]] for o in items])
    for yi, o in zip(y, items):
        ax.text(o[4] + .08, yi, f"Rs {o[4]:.1f}", va="center", fontsize=7.5)
    ax.set_yticks(y); ax.set_yticklabels([o[0] for o in items], fontsize=7.5)
    ax.set_xlabel("Illustrative cost (Rs per kg of cake treated)"); ax.set_xlim(0, 7.2)
    ax.grid(axis="x", alpha=.25); ax.spines[["top", "right"]].set_visible(False)
    from matplotlib.patches import Patch
    ax.legend(handles=[Patch(color=c, label=k) for k, c in cmap.items()], fontsize=7.5, frameon=False, loc="lower right")
    fig.tight_layout(); return fig

def chart_cost_vs_pea(c):
    fig, axs = plt.subplots(1, 2, figsize=(9, 3.4), gridspec_kw={"width_ratios": [1.25, 1]})
    ax = axs[0]
    labels = ["Base\ncake", "Enzymes +\nprocess", "Taste\npackage"]
    vals = [c["base"], c["treat"] + c["enz"], c["taste"]]
    cols = [HEX["gr"], HEX["p"], HEX["g"]]
    bottom = 0
    for l, v, col in zip(labels, vals, cols):
        ax.bar(["Treated cake\n(per kg)"], [v], bottom=bottom, color=col, label=l.replace("\n", " "))
        ax.text(0, bottom + v / 2, f"Rs {v:.1f}", ha="center", va="center", color="white", fontsize=8, fontweight="bold")
        bottom += v
    ax.set_ylabel("Rs per kg of material"); ax.legend(fontsize=7.5, frameon=False, loc="upper right")
    ax.text(0, bottom + 1, f"Total Rs {bottom:.1f}", ha="center", fontsize=8.5, fontweight="bold")
    ax.set_ylim(0, bottom * 1.55); style_ax(ax)
    ax = axs[1]
    names = ["Treated\ngroundnut cake", "Imported\npea isolate"]
    v = [c["per_kg_protein"], c["pea_per_kg_protein"]]
    err = [[c["per_kg_protein"] * .25] * 2, [c["pea_per_kg_protein"] * .15] * 2]
    ax.bar(names, v, yerr=np.array(err).T if False else [e[0] for e in err], capsize=5,
           color=[HEX["g"], HEX["gr"]])
    for i, val in enumerate(v):
        ax.text(i, val * .5, f"Rs {val:.0f}", ha="center", color="white", fontsize=9, fontweight="bold")
    ax.set_ylabel("Rs per kg of protein"); ax.set_title("Cost per kg protein (range bars)", fontsize=9, fontweight="bold")
    style_ax(ax); fig.tight_layout(); return fig


# ---------- cost maths ----------
def cost_summary(d):
    pkg = [o for o in OPTIONS if o[7]]
    enz = sum(o[4] for o in pkg if o[1] == "Enzyme")
    taste = sum(o[4] for o in pkg if o[1] != "Enzyme")
    total = d["base_cost_inr_kg"] + TREAT_COST + enz + taste
    retention = 0.96
    per_kg_protein = total / (d["protein_pct"] / 100 * retention)
    pea_per_kg_protein = d["pea_isolate_inr_kg"] / (d["pea_protein_pct"] / 100)
    return dict(base=d["base_cost_inr_kg"], treat=TREAT_COST, enz=enz, taste=taste, total=total,
                per_kg_protein=per_kg_protein, pea_per_kg_protein=pea_per_kg_protein, pkg=pkg)


# ---------- PDF styles ----------
def S(name, **kw):
    base = dict(fontName="DV", fontSize=8.8, leading=12.4, textColor=colors.HexColor("#111827"))
    base.update(kw); return ParagraphStyle(name, **base)
body = S("body"); small = S("small", fontSize=7.4, leading=10, textColor=GREY)
h1 = S("h1", fontName="DV-B", fontSize=13, leading=17, textColor=GREEN, spaceBefore=8, spaceAfter=4, keepWithNext=1)
h2 = S("h2", fontName="DV-B", fontSize=10, leading=14, textColor=GREEN, spaceBefore=6, spaceAfter=2, keepWithNext=1)
cell = S("cell", fontSize=7.6, leading=10); cellb = S("cellb", fontName="DV-B", fontSize=7.6, leading=10)
cellh = S("cellh", fontName="DV-B", fontSize=7.6, leading=10, textColor=colors.white)
bullet = S("bullet", leftIndent=10, bulletIndent=0, spaceAfter=1.5)

def tier(t):
    return Paragraph(f'<font color="{TIER[t]}"><b>{t}</b></font>', cell)

def tbl(rows, widths, header=True, zebra=True, extra=None):
    t = Table(rows, colWidths=[w * mm for w in widths], repeatRows=1 if header else 0)
    st = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), .4, colors.HexColor("#D1D5DB")),
          ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
          ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4)]
    if header: st += [("BACKGROUND", (0, 0), (-1, 0), GREEN)]
    if zebra:
        for i in range(1, len(rows)):
            if i % 2 == 0: st.append(("BACKGROUND", (0, i), (-1, i), GREY_L))
    if extra: st += extra
    t.setStyle(TableStyle(st)); return t

def box(paras, bg, border, w=174):
    t = Table([[paras]], colWidths=[w * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), 1.1, border),
                           ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                           ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    return t

def P(txt, st=body): return Paragraph(txt, st)
def C(txt): return Paragraph(txt, cell)
def CB(txt): return Paragraph(txt, cellb)
def CH(txt): return Paragraph(txt, cellh)

def page_deco(canv, doc):
    w, h = A4
    canv.saveState()
    canv.setFillColor(GREEN); canv.rect(0, h - 11 * mm, w, 11 * mm, stroke=0, fill=1)
    canv.setFillColor(colors.white); canv.setFont("DV-B", 9)
    canv.drawString(18 * mm, h - 7.2 * mm, "ProteinRescue AI")
    canv.setFont("DV", 8)
    canv.drawRightString(w - 18 * mm, h - 7.2 * mm, f"Predictive Treatment Report  |  {doc.report_id}")
    canv.setStrokeColor(colors.HexColor("#D1D5DB")); canv.line(18 * mm, 15 * mm, w - 18 * mm, 15 * mm)
    canv.setFillColor(RED); canv.setFont("DV-B", 7)
    canv.drawString(18 * mm, 10.5 * mm, "Computational AI estimate only. Not a laboratory result or food-safety certification.")
    canv.setFillColor(GREY); canv.setFont("DV", 7.5)
    canv.drawRightString(w - 18 * mm, 10.5 * mm, f"Page {doc.page}")
    canv.restoreState()


def build_report(d, out_path):
    c = cost_summary(d)
    today = datetime.date.today().strftime("%d %b %Y")
    gated = d["aflatoxin_result"] is None
    doc = BaseDocTemplate(out_path, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                          topMargin=17 * mm, bottomMargin=20 * mm,
                          title=f"ProteinRescue AI Report - {d['byproduct']}", author="ProteinRescue AI")
    doc.report_id = d["report_id"]
    doc.addPageTemplates([PageTemplate(id="p", frames=[Frame(18 * mm, 20 * mm, 174 * mm, 257 * mm, id="f",
                          leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPage=page_deco)])
    E = []

    # ---- Title block
    title = Table([[Paragraph('<font color="white" size="19"><b>Predictive Treatment Report</b></font>', S("t", leading=24)),
                    ],
                   [Paragraph(f'<font color="#D1FAE5" size="10">{d["byproduct"]}  |  Enzymatic treatment, taste and cost forecast</font>', S("t2", leading=14))]],
                  colWidths=[174 * mm])
    title.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), GREEN), ("LEFTPADDING", (0, 0), (-1, -1), 10),
                               ("TOPPADDING", (0, 0), (0, 0), 10), ("BOTTOMPADDING", (0, 1), (0, 1), 10)]))
    E += [title, Spacer(1, 5)]
    meta = tbl([[CB("Report ID"), C(d["report_id"]), CB("Date"), C(today)],
                [CB("By-product"), C(d["byproduct"]), CB("Report type"), C("Simulation (Model tier)")],
                [CB("Aflatoxin status"), C('<font color="#B91C1C"><b>NOT TESTED / NOT VERIFIED</b></font>' if gated else "Result on file"),
                 CB("Prepared by"), C("ProteinRescue AI platform")]],
               [30, 57, 30, 57], header=False, zebra=False,
               extra=[("BACKGROUND", (0, 0), (0, -1), GREEN_L), ("BACKGROUND", (2, 0), (2, -1), GREEN_L)])
    E += [meta, Spacer(1, 6)]

    E.append(box([P('<b>NOTICE:</b> Computational AI estimate only. Not a laboratory result or food-safety certification.',
                    S("n", fontName="DV-B", textColor=AMBER, fontSize=9))], AMBER_L, AMBER))
    E.append(Spacer(1, 5))
    if gated:
        E.append(box([
            P('<font color="#B91C1C" size="11"><b>[X] HUMAN FOOD ROUTE GATED (SAFETY CRITICAL)</b></font>', S("g1", leading=15)),
            Spacer(1, 3),
            P(f"{d['byproduct']} cannot be routed to human food applications without verified aflatoxin test results on file."),
            Spacer(1, 2),
            P("<b>Mandatory Gate:</b> Groundnut cake cannot be presented or considered suitable for human food when aflatoxin "
              "results are missing or unverified. Analytical laboratory testing is required first."),
        ], RED_L, RED))
    E.append(Spacer(1, 6))

    # ---- Summary
    E.append(P("1. Summary", h1))
    E.append(P(f"The processing parameters for {d['byproduct']} indicate a treatment temperature of <b>{d['temp_c']} C</b> for "
               f"<b>{d['time_min']} minutes</b> with an enzyme dose of <b>{d['enzyme_u_per_g']} units per gram</b>. The initial protein content is "
               f"<b>{d['protein_pct']}%</b>, and the feedstock contains <b>{d['phytate_mg_g']} mg</b> of phytate and <b>{d['tannin_mg_g']} mg</b> of tannin per gram. "
               f"{'An aflatoxin test has not been conducted.' if gated else 'An aflatoxin result is on file and must be reviewed by a qualified laboratory.'}"))
    ph = red_curve([d["time_min"]], d["temp_c"], d["enzyme_u_per_g"], K_PHY)[0]
    tn = red_curve([d["time_min"]], d["temp_c"], d["enzyme_u_per_g"], K_TAN)[0]
    ph_s = red_curve([SUGGEST["time_min"]], SUGGEST["temp_c"], SUGGEST["enzyme_u_per_g"], K_PHY)[0]
    tn_s = red_curve([SUGGEST["time_min"]], SUGGEST["temp_c"], SUGGEST["enzyme_u_per_g"], K_TAN)[0]
    E.append(Spacer(1, 4))

    def kpi(big, lab, col):
        return [Paragraph(f'<font color="{col}" size="15"><b>{big}</b></font>', S("k", alignment=TA_CENTER, leading=19)),
                Paragraph(lab, S("kl", alignment=TA_CENTER, fontSize=7.2, leading=9.5, textColor=GREY))]
    k = Table([[kpi(f"{ph:.0f}%", "Phytate reduction<br/>(current plan)", "#B91C1C"),
                kpi(f"{tn:.0f}%", "Tannin reduction<br/>(current plan)", "#B91C1C"),
                kpi(f"{ph_s:.0f}% / {tn_s:.0f}%", "Phytate / tannin reduction<br/>(suggested plan)", "#1B5E3F"),
                kpi(f"Rs {c['total']:.0f}/kg", "Treated + taste-improved<br/>cost (illustrative)", "#1B5E3F")]],
              colWidths=[43.5 * mm] * 4)
    k.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), .6, colors.HexColor("#D1D5DB")),
                           ("INNERGRID", (0, 0), (-1, -1), .4, colors.HexColor("#E5E7EB")),
                           ("BACKGROUND", (0, 0), (-1, -1), GREEN_L), ("TOPPADDING", (0, 0), (-1, -1), 6),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    E += [k, Spacer(1, 3), P("All figures are Model-tier simulation outputs shown as single points; real results are ranges (see charts).", small)]

    # ---- Inputs
    E.append(P("2. Input Parameters and Checks", h1))
    rows = [[CH("Parameter"), CH("Value"), CH("Evidence tier"), CH("Note")],
            [C("Treatment temperature"), C(f"{d['temp_c']} C"), tier("User input"), C("Entered by user")],
            [C("Treatment time"), C(f"{d['time_min']} min"), tier("User input"), C("Entered by user")],
            [C("Enzyme dose"), C(f"{d['enzyme_u_per_g']} U/g"), tier("User input"), C("Entered by user")],
            [C("Initial protein"), C(f"{d['protein_pct']} %"), tier("User input"), C("From lab report / manual")],
            [C("Phytate"), C(f"{d['phytate_mg_g']} mg/g"), tier("User input"), C("From lab report / manual")],
            [C("Tannin"), C(f"{d['tannin_mg_g']} mg/g"), tier("User input"), C("From lab report / manual")],
            [C("Aflatoxin"), C('<font color="#B91C1C"><b>Not tested</b></font>' if gated else "On file"), tier("Validated" if not gated else "User input"),
             C("Hard gate for human food")]]
    E.append(tbl(rows, [42, 28, 28, 76]))
    E.append(Spacer(1, 5))
    checks = [P("<b>Early-correction flags (auto-generated)</b>", S("c", fontName="DV-B", textColor=AMBER))]
    if d["temp_c"] < 30:
        checks.append(P(f"- Temperature {d['temp_c']} C is far below the usual working range of food enzymes (about 40-55 C for many phytases). "
                        "Expect slow, incomplete reaction.", bullet))
    if d["protein_pct"] < 30:
        checks.append(P(f"- Protein {d['protein_pct']}% is low for groundnut cake (literature values are often much higher). Please verify the lab entry.", bullet))
    if d["phytate_mg_g"] < 5:
        checks.append(P(f"- Phytate {d['phytate_mg_g']} mg/g looks low versus typical published ranges. Please verify units.", bullet))
    checks.append(P("- Confidence: <b>Low</b>. Inputs sit outside the range of the published data used for this model.", bullet))
    E.append(box(checks, AMBER_L, AMBER))

    # ---- Trajectory
    E.append(PageBreak())
    E.append(P("3. Treatment Trajectory Forecast", h1))
    E.append(P("The twin predicts how anti-nutrients fall over time. Shaded bands show the likely range (+/-35% on reaction speed). "
               "The red line is your current plan; the green line is the suggested correction."))
    E.append(fig_to_img(chart_trajectory(d), 174, 63))
    E.append(Spacer(1, 3))
    rows = [[CH("Metric"), CH("Current plan"), CH("Suggested plan"), CH("Tier")],
            [C("Temperature / time / dose"), C(f"{d['temp_c']} C / {d['time_min']} min / {d['enzyme_u_per_g']} U/g"),
             C(f"{SUGGEST['temp_c']} C / {SUGGEST['time_min']} min / {SUGGEST['enzyme_u_per_g']} U/g"), tier("Model")],
            [C("Phytate reduction (range)"), C(f"{ph:.0f}% ({ph*.6:.0f}-{ph*1.4:.0f}%)"), C(f"{ph_s:.0f}% ({ph_s*.8:.0f}-{min(99,ph_s*1.15):.0f}%)"), tier("Model")],
            [C("Tannin reduction (range)"), C(f"{tn:.0f}% ({tn*.6:.0f}-{tn*1.4:.0f}%)"), C(f"{tn_s:.0f}% ({tn_s*.8:.0f}-{min(99,tn_s*1.2):.0f}%)"), tier("Model")],
            [C("Protein retention (range)"), C("98.5-99.8 %"), C("94-98 %"), tier("Model")],
            [C("Bitter-peptide risk"), C("Low"), C("Medium (longer run, side protease)"), tier("Model")]]
    E.append(tbl(rows, [46, 44, 62, 22]))

    # ---- Taste module
    E.append(P("4. Taste and Off-Flavour Improvement Module (NEW)", h1))
    E.append(P("Bitter, beany or rough taste is the main reason by-products stay in animal feed. This module shows <b>why</b> the bad taste "
               "appears (including enzyme by-products), <b>what</b> enzymes, chemicals and plant-based ingredients can fix it, and "
               "<b>what it costs</b>."))
    E.append(P("4.1 Why does the bad taste appear?", h2))
    rows = [[CH("Compound"), CH("Origin"), CH("Reason / mechanism"), CH("Taste"), CH("Level in batch"), CH("Tier")]]
    for n, o, r, tst, lvl, tr in CAUSES:
        lc = {"High": "#B91C1C", "Medium": "#B45309", "Low-Med": "#B45309", "Low": "#15803D"}[lvl]
        rows.append([CB(n), C(o), C(r), C(tst), C(f'<font color="{lc}"><b>{lvl}</b></font>'), tier(tr)])
    E.append(tbl(rows, [27, 22, 62, 21, 18, 24]))
    E.append(Spacer(1, 3))
    E.append(P("Key point: the enzymatic treatment itself can create bitterness (bitter peptides) if protease activity is present, so the "
               "treatment plan and the taste fix must be designed together.", small))

    E.append(P("4.2 Predicted off-flavour change", h2))
    E.append(fig_to_img(chart_flavour(), 174, 65))
    E.append(P("Index 0 = none, 10 = very strong. Model/Assumption tier values. Needs trained sensory panel or electronic-tongue validation.", small))

    # ---- Options
    E.append(P("4.3 Corrective options: enzymes, chemicals and plant-based maskers", h2))
    rows = [[CH("Name"), CH("Type"), CH("What it fixes"), CH("Typical dose"), CH("Cost Rs/kg"), CH("Source"), CH("In pkg")]]
    for o in OPTIONS:
        rows.append([CB(o[0]), C(o[1]), C(o[2]), C(o[3]), C(f"{o[4]:.1f}"), C(o[5]), C("YES" if o[7] else "-")])
    pk_rows = [i + 1 for i, o in enumerate(OPTIONS) if o[7]]
    E.append(tbl(rows, [34, 21, 38, 22, 13, 28, 18][:6] + [18], extra=[("BACKGROUND", (0, i), (-1, i), GREEN_L) for i in pk_rows]))
    E.append(Spacer(1, 3))
    E.append(P("Doses and costs are <b>Assumption</b> tier: editable placeholders to be confirmed with supplier quotes and bench trials. "
               "Enzymes are microbial-fermentation products. 'Plant-based masker' means a plant-derived ingredient that improves taste.", small))
    E.append(Spacer(1, 4))
    E.append(fig_to_img(chart_option_costs(), 174, 87))

    # ---- Package + cost
    E.append(P("5. Recommended Taste Package and Cost", h1))
    names = ", ".join(o[0].split(" (")[0] for o in c["pkg"])
    E.append(P(f"<b>Suggested package:</b> {names}."))
    E.append(Spacer(1, 3))
    rows = [[CH("Cost item"), CH("Rs per kg"), CH("Tier")],
            [C("Base groundnut cake (editable)"), C(f"{c['base']:.1f}"), tier("Assumption")],
            [C("Treatment energy + water"), C(f"{c['treat']:.1f}"), tier("Assumption")],
            [C("Enzymes (phytase, tannase, aminopeptidase)"), C(f"{c['enz']:.1f}"), tier("Assumption")],
            [C("Chemicals + plant-based maskers"), C(f"{c['taste']:.1f}"), tier("Assumption")],
            [CB("Total treated + taste-improved"), CB(f"{c['total']:.1f}"), tier("Model")],
            [CB("Cost per kg protein (96% retention)"), CB(f"{c['per_kg_protein']:.0f}"), tier("Model")],
            [CB(f"Imported pea isolate per kg protein ({d['pea_protein_pct']:.0f}% protein, Rs {d['pea_isolate_inr_kg']:.0f}/kg)"),
             CB(f"{c['pea_per_kg_protein']:.0f}"), tier("Assumption")]]
    E.append(tbl(rows, [110, 30, 34], extra=[("BACKGROUND", (0, 5), (-1, 7), GREEN_L)]))
    E.append(Spacer(1, 4))
    E.append(fig_to_img(chart_cost_vs_pea(c), 174, 66))
    E.append(P("Cost comparison is for planning only. It does not mean the material is allowed for human food (see safety gate). "
               "Result is very sensitive to the protein % entered; check that value first.", small))

    # ---- Route
    E.append(P("6. Route Suggestion", h1))
    if gated:
        E.append(box([P('<font color="#B91C1C"><b>[X] Human food route gated: aflatoxin verification missing.</b></font> '
                        "Material must never be presented or routed for human food without verified lab results on file."),
                      Spacer(1, 3),
                      P("An aflatoxin test is required first. Until an aflatoxin test result is on file, the material should not be "
                        "considered for any utilization route. A qualified analytical laboratory and food safety professional must "
                        "review any aflatoxin test result against regulatory thresholds."),
                      Spacer(1, 3),
                      P("The taste package in Section 4 is a <b>hypothetical</b> option. It does not make the material safe. Any enzyme or additive "
                        "used in a human food must also comply with FSSAI rules and be checked by a food-safety professional.")], RED_L, RED))

    E.append(P("7. Considerations", h1))
    for t in ["Biochemical markers such as protein content, phytate, and tannin levels may suggest potential trends in anti-nutrient reduction and protein retention.",
              "The treatment temperature and time, along with the enzyme dose, are critical factors that may influence the efficacy of protein processing and anti-nutrient reduction.",
              "Longer enzyme treatment may raise bitter-peptide formation; debittering enzymes and masking ingredients should be planned together."]:
        E.append(Paragraph(t, bullet, bulletText="\u2022"))

    E.append(P("8. Recommended Next Tests", h1))
    for t in ["Conduct an aflatoxin test to determine the safety of the material.",
              "Measure protein retention to validate the effectiveness of the enzymatic treatment.",
              "Assess anti-nutrient reduction, specifically phytate and tannin levels, to confirm the treatment's impact.",
              "Run a sensory panel or electronic-tongue test, and GC-MS for hexanal / 2-pentylfuran, to confirm taste improvement.",
              "Confirm enzyme and additive prices with supplier quotes."]:
        E.append(Paragraph(t, bullet, bulletText="\u2022"))

    E.append(P("9. Limitations", h1))
    E.append(P("This computational estimate provides a qualitative summary and does not include empirical validation. Specific laboratory assays "
               "and analytical tests are required to validate protein retention, anti-nutrient reduction, taste change, and safety."))
    E.append(Spacer(1, 4))
    E.append(P("Evidence tiers used in this report", h2))
    rows = [[tier("Validated"), C("Confirmed by lab data on file")],
            [tier("Published"), C("From peer-reviewed literature (cite DOI in knowledge base)")],
            [tier("Model"), C("Output of the ProteinRescue AI simulation")],
            [tier("Assumption"), C("Editable placeholder to verify (prices, doses, scores)")],
            [tier("User input"), C("Value entered or extracted from an uploaded report")]]
    E.append(tbl(rows, [30, 144], header=False, zebra=False))
    E.append(Spacer(1, 6))
    E.append(box([P("<b>Mandatory Disclaimer:</b> Illustrative simulation and unvalidated AI estimate only. Not a laboratory result, "
                    "not scientifically validated, and not a food-safety or regulatory determination.",
                    S("d", fontName="DV-B", fontSize=8.5, textColor=RED))], RED_L, RED))
    doc.build(E)


if __name__ == "__main__":
    build_report(DATA, "/mnt/user-data/outputs/ProteinRescue_AI_Report_GroundnutCake.pdf")
    print("done")     0                           yÞ