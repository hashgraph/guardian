#!/usr/bin/env python3
"""
CPython entrypoint for the Guardian Python sandbox container.
Receives JSON input via stdin, executes user Python code, sends results via stdout.
Protocol: newline-delimited JSON messages.
"""
import sys
import json
import os


def _json_serializer(obj):
    """Handle non-JSON-serializable types (numpy, pandas, datetime, etc.)."""
    try:
        import numpy as np
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            # Handle NaN and Inf
            val = float(obj)
            if val != val:  # NaN
                return None
            if val == float('inf') or val == float('-inf'):
                return None
            return val
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
    except ImportError:
        pass
    try:
        import pandas as pd
        if isinstance(obj, pd.DataFrame):
            return obj.to_dict(orient='records')
        if isinstance(obj, pd.Series):
            return obj.tolist()
    except ImportError:
        pass
    import datetime
    if isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    if isinstance(obj, datetime.timedelta):
        return obj.total_seconds()
    if isinstance(obj, set):
        return list(obj)
    if isinstance(obj, bytes):
        return obj.decode('utf-8', errors='replace')
    return str(obj)


def send_message(msg):
    """Send a JSON message to stdout (protocol line)."""
    sys.stdout.write(json.dumps(msg, default=_json_serializer) + '\n')
    sys.stdout.flush()


def build_table_helper(tables_pack):
    """Port of buildTableHelper from table-field-core.ts."""

    def is_plain_object(value):
        return isinstance(value, dict)

    def is_table_value(value):
        return is_plain_object(value) and value.get('type') == 'table'

    def empty_table():
        return {'type': 'table', 'columnKeys': [], 'rows': []}

    def to_object(value):
        if value is None:
            return empty_table()
        if isinstance(value, str):
            try:
                return json.loads(value)
            except (json.JSONDecodeError, ValueError):
                return empty_table()
        return value

    def normalize(value):
        maybe_table = to_object(value)
        if not is_table_value(maybe_table):
            return empty_table()
        if tables_pack and isinstance(maybe_table.get('fileId'), str):
            packed = tables_pack.get(maybe_table['fileId'])
            if packed:
                return {
                    'type': 'table',
                    'columnKeys': packed.get('columnKeys', []) if isinstance(packed.get('columnKeys'), list) else [],
                    'rows': packed.get('rows', []) if isinstance(packed.get('rows'), list) else [],
                    'fileId': maybe_table['fileId']
                }
        return {
            'type': 'table',
            'columnKeys': maybe_table.get('columnKeys', []) if isinstance(maybe_table.get('columnKeys'), list) else [],
            'rows': maybe_table.get('rows', []) if isinstance(maybe_table.get('rows'), list) else [],
            'fileId': maybe_table.get('fileId') if isinstance(maybe_table.get('fileId'), str) else None
        }

    def get_column_keys(value):
        table = normalize(value)
        if table['columnKeys']:
            return table['columnKeys']
        rows = table['rows']
        if rows:
            return list(rows[0].keys())
        return []

    def get_rows(value):
        return normalize(value)['rows']

    def get_column_key_by_index(value, index):
        keys = get_column_keys(value)
        if 0 <= index < len(keys):
            return keys[index]
        return ''

    def get_cell(value, row_index, key_or_index):
        rows = get_rows(value)
        if row_index < 0 or row_index >= len(rows):
            return None
        row = rows[row_index]
        column_key = get_column_key_by_index(value, key_or_index) if isinstance(key_or_index, int) else key_or_index
        return row.get(column_key)

    def to_number(value):
        if isinstance(value, (int, float)):
            return value if value == value else 0  # NaN check
        if isinstance(value, str):
            try:
                return float(value.replace(',', '.'))
            except (ValueError, TypeError):
                return 0
        return 0

    def get_column_values(value, key_or_index):
        column_key = get_column_key_by_index(value, key_or_index) if isinstance(key_or_index, int) else key_or_index
        return [row.get(column_key) for row in get_rows(value)]

    class TableHelper:
        """Wrapper to match the JS table helper interface."""
        pass

    helper = TableHelper()
    helper.normalize = normalize
    helper.keys = get_column_keys
    helper.rows = get_rows
    helper.cell = get_cell
    helper.col = get_column_values
    helper.num = to_number
    return helper


def main():
    # Read JSON input from stdin
    try:
        raw = sys.stdin.read()
        input_data = json.loads(raw)
    except Exception as e:
        send_message({'type': 'error', 'error': f'Failed to parse input: {e}'})
        sys.exit(1)

    exec_func = input_data.get('execFunc', '')
    user = input_data.get('user', {})
    documents = input_data.get('documents', [])
    artifacts = input_data.get('artifacts', [])
    sources = input_data.get('sources', [])
    tables_pack = input_data.get('tablesPack', {})

    # Build callbacks
    def done(result, final=True):
        send_message({'type': 'done', 'result': result, 'final': final})

    def debug(result):
        send_message({'type': 'debug', 'result': result})

    # Override print to send via JSON protocol
    def sandbox_print(*args, **kwargs):
        send_message({'type': 'stdout', 'message': ' '.join(str(a) for a in args)})

    # Build table helper
    table = build_table_helper(tables_pack)

    # Prepare user namespace
    user_globals = {
        '__builtins__': __builtins__,
        'user': user,
        'documents': documents,
        'artifacts': artifacts,
        'sources': sources,
        'done': done,
        'debug': debug,
        'print': sandbox_print,
        'table': table,
    }

    # Clear sensitive env vars right before user code runs
    # (after all library imports that may set their own vars)
    keep_keys = {'HOME', 'PATH'}
    for key in list(os.environ.keys()):
        if key not in keep_keys:
            del os.environ[key]

    # Execute user code
    try:
        exec(exec_func, user_globals)
    except Exception as e:
        send_message({'type': 'error', 'error': f'{type(e).__name__}: {e}'})
        sys.exit(1)


if __name__ == '__main__':
    main()
