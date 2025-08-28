def read_file(file_path):
    """
    Read and process a text file
    
    Args:
        file_path (str): Path to the text file
        
    Returns:
        str: Processed content or analysis result
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            print(f"\n**********File content read from {file_path}:")
            print(content)
            
            # Add your custom file processing logic here
            # For example:
            word_count = len(content.split())
            char_count = len(content)
            line_count = len(content.splitlines())
            
            # Return analysis or processed result
            analysis = f"\n**********File analysis: {word_count} words, {char_count} characters, {line_count} lines."
            
            return analysis
            
    except Exception as e:
        error_msg = f"Error reading file: {str(e)}"
        print(error_msg)
        return error_msg