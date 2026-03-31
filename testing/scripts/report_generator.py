import json
import os
from pathlib import Path

def generate_html_report(json_report_path="testing/reports/ml_validation_summary.json", output_html="testing/reports/index.html"):
    if not os.path.exists(json_report_path):
        print(f"JSON report {json_report_path} not found.")
        return

    with open(json_report_path, 'r') as f:
        data = json.load(f)

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SwachhaNet - Reliability Report</title>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333; margin: 40px; }}
            h1 {{ color: #2c3e50; border-bottom: 2px solid #2ecc71; padding-bottom: 10px; }}
            .container {{ display: flex; flex-wrap: wrap; gap: 20px; }}
            .card {{ background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); flex: 1; min-width: 300px; }}
            .metric {{ font-size: 2em; font-weight: bold; color: #2ecc71; }}
            .label {{ font-size: 0.9em; color: #7f8c8d; text-transform: uppercase; }}
            .error {{ color: #e74c3c; }}
            img {{ max-width: 100%; height: auto; margin-top: 20px; border-radius: 8px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
            th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
            th {{ background-color: #f2f2f2; }}
        </style>
    </head>
    <body>
        <h1>Reliability Pipeline - Automated Verification Report</h1>
        <div class="container">
            <div class="card">
                <div class="label">Total Samples</div>
                <div class="metric">{data['total_samples']}</div>
            </div>
            <div class="card">
                <div class="label">Validity Accuracy</div>
                <div class="metric">{data['metrics']['accuracy']*100:.2f}%</div>
            </div>
            <div class="card">
                <div class="label">Average Latency</div>
                <div class="metric">{data['average_latency']}s</div>
            </div>
            <div class="card">
                <div class="label">Detected Failures</div>
                <div class="metric error">{data['errors']}</div>
            </div>
        </div>
        
        <h2>Model Confusion Matrix</h2>
        <img src="confusion_matrix.png" alt="Confusion Matrix">
        
        <h2>Detailed Metrics</h2>
        <table>
            <tr><th>Waste Type</th><th>Precision</th><th>Recall</th><th>F1-Score</th></tr>
            {"".join([f"<tr><td>{k}</td><td>{v['precision']:.2f}</td><td>{v['recall']:.2f}</td><td>{v['f1-score']:.2f}</td></tr>" for k,v in data['metrics'].items() if isinstance(v, dict)])}
        </table>
    </body>
    </html>
    """
    
    with open(output_html, 'w') as f:
        f.write(html_content)
    print(f"HTML report generated at {output_html}")

if __name__ == "__main__":
    generate_html_report()
