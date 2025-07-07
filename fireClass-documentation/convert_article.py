#!/usr/bin/env python3
"""
Convert Markdown article to HTML with proper styling
"""

import markdown
import os

def convert_markdown_to_html():
    # Read the markdown file
    with open('article_final.md', 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # Convert to HTML
    html_content = markdown.markdown(md_content, extensions=['fenced_code', 'tables', 'codehilite'])
    
    # Create full HTML document
    full_html = f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>fireClass Control - Article</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
        }}
        
        .article-container {{
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }}
        
        h1 {{
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }}
        
        h2 {{
            color: #34495e;
            margin-top: 40px;
            margin-bottom: 20px;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }}
        
        h3 {{
            color: #2c3e50;
            margin-top: 30px;
            margin-bottom: 15px;
        }}
        
        p {{
            margin-bottom: 15px;
            text-align: justify;
        }}
        
        code {{
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            color: #e74c3c;
        }}
        
        pre {{
            background: #2d3748;
            color: #f7fafc;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
        }}
        
        pre code {{
            background: none;
            color: inherit;
            padding: 0;
        }}
        
        .svg-container {{
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }}
        
        .svg-container svg {{
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 8px;
        }}
        
        blockquote {{
            border-left: 4px solid #3498db;
            margin: 20px 0;
            padding: 10px 20px;
            background: #ecf0f1;
            font-style: italic;
        }}
        
        ul, ol {{
            margin: 15px 0;
            padding-left: 30px;
        }}
        
        li {{
            margin-bottom: 8px;
        }}
        
        .highlight {{
            background: #fff3cd;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
        }}
        
        @media (max-width: 768px) {{
            body {{
                padding: 10px;
            }}
            
            .article-container {{
                padding: 20px;
            }}
            
            h1 {{
                font-size: 24px;
            }}
            
            h2 {{
                font-size: 20px;
            }}
        }}
    </style>
</head>
<body>
    <div class="article-container">
        {html_content}
    </div>
</body>
</html>"""
    
    # Write to file
    with open('article_final.html', 'w', encoding='utf-8') as f:
        f.write(full_html)
    
    print("✅ Article converted successfully!")
    print("📄 Open 'article_final.html' in your browser to view the article")

if __name__ == "__main__":
    convert_markdown_to_html() 