from app.api.endpoints.ml import analyze_file_threat, analyze_file_with_content

filename = 'resume_malicious_demo.pdf'
# Sample PDF header + some benign text
content = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog >>\nendobj\nmalicious sample content text\n"

print('Filename-only analysis:')
print(analyze_file_threat(filename, len(content)))
print('\nContent analysis:')
print(analyze_file_with_content(filename, content, len(content)))
