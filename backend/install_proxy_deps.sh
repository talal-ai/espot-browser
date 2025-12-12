# Install Backend Dependencies for Proxy Routing

# Install main dependencies
pip install "httpx[socks]>=0.25.0" "aiohttp>=3.9.0"

# Or install from pyproject.toml (recommended)
pip install -e .

echo "✓ Proxy routing dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Start the backend server"
echo "2. Test proxy activation from frontend"
echo "3. Check PROXY_ROUTING_GUIDE.md for complete documentation"
