import sys
import qrcode

def generate_qr(url, out_path):
    img = qrcode.make(url)
    img.save(out_path)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python generate_qr.py <URL> <output.png>')
        sys.exit(1)
    url = sys.argv[1]
    out = sys.argv[2]
    generate_qr(url, out)
    print(f'QR code saved to {out}')
