import sys
import urllib.request, json

if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

print("=" * 50)
print("ROADMAP NEON - TEST SUITE")
print("=" * 50)

# 1.4 Health Check
try:
    r = urllib.request.urlopen('http://127.0.0.1:5000/api/health', timeout=30)
    data = json.loads(r.read())
    print(f"\n[1.4 Health] Status: {r.status}")
    print(f"  Tables: {data.get('tables', [])}")
    print(f"  Version: {data.get('version', '?')}")
    print("  RESULT: PASS")
except Exception as e:
    print(f"\n[1.4 Health] FAIL: {e}")

# 2.1 GET Orders
try:
    r = urllib.request.urlopen('http://127.0.0.1:5000/api/orders', timeout=30)
    data = json.loads(r.read())
    print(f"\n[2.1 GET Orders] Status: {r.status}")
    print(f"  Count: {len(data)}")
    for o in data[:3]:
        oid = o.get('id', '?')
        ot = o.get('ot', '?')
        st = o.get('status', '?')
        print(f"  - id={oid}, ot={ot}, status={st}")
    print("  RESULT: PASS")
except Exception as e:
    print(f"\n[2.1 GET Orders] FAIL: {e}")

# 2.2 POST Order
test_order_id = None
try:
    payload = json.dumps({
        'nombreTarea': 'Test Roadmap Neon v2',
        'status': 'orden'
    }).encode()
    req = urllib.request.Request(
        'http://127.0.0.1:5000/api/orders',
        data=payload,
        method='POST'
    )
    req.add_header('Content-Type', 'application/json')
    r = urllib.request.urlopen(req, timeout=30)
    data = json.loads(r.read())
    test_order_id = data.get('id')
    uid = data.get('uuid', '?')
    ot = data.get('ot', '?')
    print(f"\n[2.2 POST Order] Status: {r.status}")
    print(f"  uuid={uid}")
    print(f"  ot={ot}")
    print(f"  id={test_order_id}")
    print("  RESULT: PASS")
except Exception as e:
    print(f"\n[2.2 POST Order] FAIL: {e}")

# 2.3 Sync Pull
try:
    url = 'http://127.0.0.1:5000/api/sync/pull?since=2020-01-01T00:00:00Z&vendedor_id=1&es_admin=true'
    r = urllib.request.urlopen(url, timeout=30)
    data = json.loads(r.read())
    st = data.get('server_time', '?')
    nc = len(data.get('cambios', []))
    print(f"\n[2.3 Sync Pull] Status: {r.status}")
    print(f"  server_time={st}")
    print(f"  cambios={nc}")
    print("  RESULT: PASS")
except Exception as e:
    print(f"\n[2.3 Sync Pull] FAIL: {e}")

# Cleanup
if test_order_id:
    try:
        req = urllib.request.Request(
            f'http://127.0.0.1:5000/api/orders/{test_order_id}',
            method='DELETE'
        )
        r = urllib.request.urlopen(req, timeout=30)
        print(f"\n[Cleanup] Test order {test_order_id} deleted")
    except Exception as e:
        print(f"\n[Cleanup] Could not delete: {e}")

print("\n" + "=" * 50)
print("TEST SUITE COMPLETE")
print("=" * 50)
