import struct, zlib
from pathlib import Path

def png(size, filename):
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            sx, sy = x * 512 / size, y * 512 / size
            color = (20, 47, 53)
            for left, top in [(128,128),(128,272),(272,272),(272,128)]:
                if left <= sx < left+112 and top <= sy < top+112:
                    color = (230,201,120) if (left,top)==(272,128) else (118,147,138)
            row.extend(color)
        rows.append(row)
    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind+data)&0xffffffff)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B',size,size,8,2,0,0,0)) + chunk(b'IDAT',zlib.compress(b''.join(rows))) + chunk(b'IEND',b'')
    Path(filename).write_bytes(data)
for size, name in [(192,'icon-192.png'),(512,'icon-512.png'),(180,'apple-touch-icon.png')]: png(size, f'icons/{name}')
