const fs = require('fs');
const path = require('path');

// Recursive function to find all nft.json files
function findNftFiles(dir, fileList = []) {
    try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                findNftFiles(filePath, fileList);
            } else if (file.endsWith('.nft.json')) {
                fileList.push(filePath);
            }
        });
    } catch (e) {
        // Ignore errors for directories that don't exist
    }
    return fileList;
}

const serverDir = '.next/server';
console.log(`Scanning ${serverDir} for trace files...`);

try {
    const nftFiles = findNftFiles(serverDir);
    console.log(`Found ${nftFiles.length} trace files.`);

    const bundleStats = nftFiles.map(nftPath => {
        try {
            const content = fs.readFileSync(nftPath, 'utf8');
            const json = JSON.parse(content);
            const files = json.files || [];
            const dir = path.dirname(nftPath);

            let totalSize = 0;
            const fileDetails = files.map(f => {
                try {
                    const absPath = path.resolve(dir, f);
                    const size = fs.statSync(absPath).size;
                    totalSize += size;
                    return { file: f, size };
                } catch (e) {
                    return { file: f, size: 0 };
                }
            });

            // Sort files by size for detail view later
            fileDetails.sort((a, b) => b.size - a.size);

            return {
                name: path.relative(serverDir, nftPath),
                totalSize,
                files: fileDetails
            };
        } catch (e) {
            return { name: nftPath, totalSize: 0, files: [], error: e.message };
        }
    });

    // Sort bundles by total size
    bundleStats.sort((a, b) => b.totalSize - a.totalSize);

    console.log('\nTop 10 Largest Serverless Functions (Estimated Uncompressed Size):');
    bundleStats.slice(0, 10).forEach(b => {
        const sizeMB = (b.totalSize / 1024 / 1024).toFixed(2);
        console.log(`\n📦 ${b.name}: ${sizeMB} MB`);
        if (b.files.length > 0) {
            console.log('   Top 5 heaviest files:');
            b.files.slice(0, 5).forEach(f => {
                console.log(`     - ${(f.size / 1024 / 1024).toFixed(2)} MB: ${f.file}`);
            });
        }
    });

} catch (err) {
    console.error('Error scanning files:', err);
}
