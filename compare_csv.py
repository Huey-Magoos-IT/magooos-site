import csv
import json
import os

def load_csv_data(filepath):
    """Loads CSV data into a list of dictionaries and a list of headers."""
    data_list = []
    header = []
    try:
        with open(filepath, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile)
            header = next(reader)
            for row_num, row_values in enumerate(reader):
                if len(row_values) != len(header):
                    print(f"Warning: Row {row_num + 2} in {filepath} has {len(row_values)} columns, expected {len(header)}. Skipping row: {row_values}")
                    continue
                row_dict = dict(zip(header, row_values))
                data_list.append(row_dict)
    except FileNotFoundError:
        print(f"Error: File not found at {filepath}")
        return [], []
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return [], []
    return data_list, header

def compare_csv_data(new_filepath, old_filepath):
    new_data_list, new_header = load_csv_data(new_filepath)
    old_data_list, old_header = load_csv_data(old_filepath)

    if not new_data_list and not old_data_list and (not new_header or not old_header) : # check if files were essentially empty or unreadable
        print("One or both files are empty or could not be read properly.")
        return

    if not new_header or not old_header:
        print("Could not read headers from one or both files. Cannot compare.")
        return
        
    if new_header != old_header:
        print("Warning: CSV headers do not match. Comparison will proceed based on new file's header structure for common columns and Loyalty ID matching.")
        print(f"New header: {new_header}")
        print(f"Old header: {old_header}")
        # For simplicity, we'll primarily use new_header for dict creation and assume 'Loyalty ID' exists if we are to compare by it.

    # Convert list of dicts to set of tuples of all values for finding fully unique/removed rows
    new_rows_as_tuples_set = set()
    for row_dict in new_data_list:
        try:
            new_rows_as_tuples_set.add(tuple(row_dict.get(h, '') for h in new_header)) # Use new_header for consistency
        except TypeError as e:
            print(f"Error converting row to tuple in new data (likely unhashable type): {row_dict}, error: {e}")


    old_rows_as_tuples_set = set()
    for row_dict in old_data_list:
        try:
            # Ensure old rows are also structured based on new_header for direct comparison if headers differ but data is similar
            # Or, more robustly, use old_header for old_rows_as_tuples_set if headers are different.
            # For this set-based comparison of entire rows, it's better if they are based on their own headers first.
            current_header_for_tuple = old_header if old_header else new_header # Fallback if old_header somehow empty
            old_rows_as_tuples_set.add(tuple(row_dict.get(h, '') for h in current_header_for_tuple))
        except TypeError as e:
            print(f"Error converting row to tuple in old data: {row_dict}, error: {e}")


    # Rows in new but not in old (exact match of all columns)
    # To make this comparison robust to column order, we should compare based on canonical representation (e.g. sorted tuple of items)
    # However, CSVs usually have fixed order. For now, tuple of values in header order is fine.
    
    # To handle potential differences in header order or subset of columns for set comparison:
    # Create canonical tuple representation (sorted by key, then value)
    def to_canonical_tuple(row_dict):
        return tuple(sorted(row_dict.items()))

    new_canonical_set = {to_canonical_tuple(row) for row in new_data_list}
    old_canonical_set = {to_canonical_tuple(row) for row in old_data_list}

    in_new_not_in_old_full_rows = []
    for canonical_row_tuple in new_canonical_set:
        if canonical_row_tuple not in old_canonical_set:
            # Convert canonical tuple back to dict for readability
            in_new_not_in_old_full_rows.append(dict(canonical_row_tuple))
            
    in_old_not_in_new_full_rows = []
    for canonical_row_tuple in old_canonical_set:
        if canonical_row_tuple not in new_canonical_set:
            in_old_not_in_new_full_rows.append(dict(canonical_row_tuple))

    # For finding modified rows, using 'Loyalty ID' as the key.
    # Fallback: if 'Loyalty ID' is not a reliable key or not present, this part will be less effective.
    # The problem implies 'Loyalty ID' is significant.
    
    new_data_keyed = {row.get('Loyalty ID', ''): row for row in new_data_list if row.get('Loyalty ID', '').strip()}
    old_data_keyed = {row.get('Loyalty ID', ''): row for row in old_data_list if row.get('Loyalty ID', '').strip()}
    
    # Filter out entries with empty Loyalty ID keys if they were added above
    new_data_keyed = {k: v for k, v in new_data_keyed.items() if k}
    old_data_keyed = {k: v for k, v in old_data_keyed.items() if k}

    modified_rows_by_loyalty_id = []
    
    common_loyalty_ids = set(new_data_keyed.keys()) & set(old_data_keyed.keys())
    
    for loyalty_id in common_loyalty_ids:
        new_row_dict = new_data_keyed[loyalty_id]
        old_row_dict = old_data_keyed[loyalty_id]
        
        # Compare these two dictionaries
        if new_row_dict != old_row_dict:
            diff_details = {'Loyalty ID': loyalty_id, 'differences': {}}
            # Use union of keys to catch columns present in one but not other for the same Loyalty ID
            all_keys = set(new_row_dict.keys()) | set(old_row_dict.keys())
            for key in sorted(list(all_keys)): # Iterate in sorted order for consistent output
                new_val = new_row_dict.get(key, 'MISSING_IN_NEW')
                old_val = old_row_dict.get(key, 'MISSING_IN_OLD')
                if new_val != old_val:
                    diff_details['differences'][key] = {'new': new_val, 'old': old_val}
            if diff_details['differences']:
                 modified_rows_by_loyalty_id.append(diff_details)

    # --- Summary Output ---
    output_dir = "comparison_results"
    os.makedirs(output_dir, exist_ok=True)

    results_summary_messages = []

    path_in_new_only = os.path.join(output_dir, "rows_in_new_only.json")
    with open(path_in_new_only, 'w', encoding='utf-8') as f:
        json.dump(in_new_not_in_old_full_rows, f, indent=2)
    results_summary_messages.append(f"1. Rows present in '{os.path.basename(new_filepath)}' but not in '{os.path.basename(old_filepath)}' (full row content): {len(in_new_not_in_old_full_rows)}. Details: '{path_in_new_only}'")

    path_in_old_only = os.path.join(output_dir, "rows_in_old_only.json")
    with open(path_in_old_only, 'w', encoding='utf-8') as f:
        json.dump(in_old_not_in_new_full_rows, f, indent=2)
    results_summary_messages.append(f"2. Rows present in '{os.path.basename(old_filepath)}' but not in '{os.path.basename(new_filepath)}' (full row content): {len(in_old_not_in_new_full_rows)}. Details: '{path_in_old_only}'")

    path_modified_rows = os.path.join(output_dir, "modified_rows_by_loyalty_id.json")
    with open(path_modified_rows, 'w', encoding='utf-8') as f:
        json.dump(modified_rows_by_loyalty_id, f, indent=2)
    results_summary_messages.append(f"3. Rows with differing values (matched by non-empty 'Loyalty ID'): {len(modified_rows_by_loyalty_id)}. Details: '{path_modified_rows}'")

    print("--- Comparison Summary ---")
    for summary_line in results_summary_messages:
        print(summary_line)
    
    print(f"\nFull details of differences saved in the '{os.path.abspath(output_dir)}' directory.")
    print("\nNote: The 'full row content' comparison treats rows as distinct if any field differs.")
    print("The 'differing values by Loyalty ID' comparison specifically identifies changes within records sharing the same Loyalty ID.")
    print("A record appearing in 'Rows present in new/old only' might also have a counterpart with the same Loyalty ID but other differing fields; such cases are complex to uniquely categorize without more specific business rules on record identity vs. modification.")

if __name__ == "__main__":
    new_file = "loyalty_data_01-20-2025_new.csv"
    old_file = "loyalty_data_01-20-2025_old.csv"
    compare_csv_data(new_file, old_file)