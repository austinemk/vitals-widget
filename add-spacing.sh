#!/bin/bash

# Post-process compiled JS files to add readable spacing
# Designed for GNOME Shell extensions with GObject classes

echo "Adding spacing to JS files..."

find dist -name "*.js" -type f | while read -r file; do
  awk '
  BEGIN { 
    prev = ""
    in_class = 0
    class_depth = 0
  }
  
  {
    line = $0
    
    # Track if we are inside a class definition
    if (line ~ /class [A-Za-z_][A-Za-z0-9_]* (extends|{)/) {
      in_class = 1
    }
    
    # Track brace depth to know when class ends
    if (line ~ /{/) {
      class_depth += gsub(/{/, "{", line)
    }
    if (line ~ /}/) {
      class_depth -= gsub(/}/, "}", line)
      if (class_depth <= 0) {
        in_class = 0
      }
    }
    
    # Add blank line before class methods (but not constructor or first method)
    # Pattern: previous line is closing brace, current line starts a method
    if (prev ~ /^[[:space:]]+}[[:space:]]*$/ && 
        line ~ /^[[:space:]]+[_a-zA-Z][_a-zA-Z0-9]*[[:space:]]*\([^)]*\)/ &&
        in_class) {
      print ""
    }
    
    # Add blank line before property definitions after methods
    # Pattern: previous line is closing brace, current line is property
    if (prev ~ /^[[:space:]]+}[[:space:]]*$/ && 
        line ~ /^[[:space:]]+[_a-zA-Z][_a-zA-Z0-9]*[[:space:]]*(=|;)/ &&
        in_class) {
      print ""
    }
    
    # Add blank line after imports block (before class/function definitions)
    if (prev ~ /^import .* from/ && 
        line !~ /^import/ && 
        line ~ /[a-zA-Z]/ &&
        line !~ /^[[:space:]]*$/) {
      print ""
    }
    
    # Add blank line before export statements (unless previous is also export)
    if (prev !~ /^export/ && 
        prev !~ /^[[:space:]]*$/ &&
        line ~ /^export (const|class|function|default)/) {
      print ""
    }
    
    # Add blank line before top-level function definitions
    if (prev !~ /^[[:space:]]*$/ && 
        prev !~ /^function/ &&
        line ~ /^function [a-zA-Z]/ &&
        !in_class) {
      print ""
    }
    
    # Add blank line before top-level class definitions
    if (prev !~ /^[[:space:]]*$/ && 
        prev !~ /^export/ &&
        line ~ /^class [A-Za-z]/ &&
        !in_class) {
      print ""
    }
    
    # Add blank line before GObject.registerClass
    if (prev !~ /^[[:space:]]*$/ &&
        line ~ /GObject\.registerClass/) {
      print ""
    }
    
    # Print current line
    print line
    
    # Update previous line tracker
    prev = line
  }
  ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
  
  echo "  ✓ Processed: $file"
done

echo "✓ Spacing complete!"