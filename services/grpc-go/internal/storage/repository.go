package storage

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

type Repository struct {
	baseDir string
}

func NewRepository(baseDir string) (*Repository, error) {
	abs, err := filepath.Abs(baseDir)
	if err != nil {
		return nil, fmt.Errorf("resolver path: %w", err)
	}
	if _, err := os.Stat(abs); os.IsNotExist(err) {
		return nil, fmt.Errorf("directorio no existe: %s", abs)
	}
	return &Repository{baseDir: abs}, nil
}

func (r *Repository) HomePath(uid string) string {
	return filepath.Join(r.baseDir, uid)
}

func (r *Repository) ResolvePath(uid, relativePath string) (string, error) {
	homePath := r.HomePath(uid)
	fullPath := filepath.Join(homePath, relativePath)
	resolved, err := filepath.Abs(fullPath)
	if err != nil {
		return "", err
	}
	if !strings.HasPrefix(resolved, homePath) {
		return "", fmt.Errorf("path traversal: %s", relativePath)
	}
	return resolved, nil
}

type FileMeta struct {
	Path        string
	SizeBytes   int64
	SHA256      string
	ModifiedAt  int64
	IsDirectory bool
	Owner       string
	Group       string
	Mode        uint32
}

func (r *Repository) ListFiles(uid, prefix string) ([]FileMeta, error) {
	basePath, err := r.ResolvePath(uid, prefix)
	if err != nil {
		return nil, err
	}
	if _, err := os.Stat(basePath); os.IsNotExist(err) {
		return nil, nil
	}
	var files []FileMeta
	homePath := r.HomePath(uid)
	filepath.WalkDir(basePath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if strings.HasPrefix(d.Name(), ".") {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		relPath, _ := filepath.Rel(homePath, path)
		meta := FileMeta{
			Path: filepath.ToSlash(relPath), SizeBytes: info.Size(),
			ModifiedAt: info.ModTime().Unix(), IsDirectory: d.IsDir(),
			Mode: uint32(info.Mode().Perm()), Owner: uid, Group: "users",
		}
		if !d.IsDir() {
			meta.SHA256, _ = r.FileHash(path)
		}
		files = append(files, meta)
		return nil
	})
	return files, nil
}

func (r *Repository) FileHash(absPath string) (string, error) {
	f, err := os.Open(absPath)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	io.Copy(h, f)
	return hex.EncodeToString(h.Sum(nil)), nil
}

func (r *Repository) WriteFile(uid, relativePath string, data []byte) error {
	fullPath, err := r.ResolvePath(uid, relativePath)
	if err != nil {
		return err
	}
	os.MkdirAll(filepath.Dir(fullPath), 0755)
	return os.WriteFile(fullPath, data, 0644)
}

func (r *Repository) ReadFile(uid, relativePath string) ([]byte, error) {
	fullPath, err := r.ResolvePath(uid, relativePath)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(fullPath)
}

func (r *Repository) ReadFileChunked(uid, relativePath string, chunkSize int, cb func([]byte, int64, bool) error) error {
	fullPath, err := r.ResolvePath(uid, relativePath)
	if err != nil {
		return err
	}
	f, err := os.Open(fullPath)
	if err != nil {
		return err
	}
	defer f.Close()
	info, _ := f.Stat()
	totalSize := info.Size()
	buf := make([]byte, chunkSize)
	var offset int64
	for {
		n, err := f.Read(buf)
		if n > 0 {
			isLast := offset+int64(n) >= totalSize
			if cbErr := cb(buf[:n], offset, isLast); cbErr != nil {
				return cbErr
			}
			offset += int64(n)
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) UsedBytes(uid string) (int64, error) {
	homePath := r.HomePath(uid)
	var total int64
	filepath.WalkDir(homePath, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		info, err := d.Info()
		if err == nil {
			total += info.Size()
		}
		return nil
	})
	return total, nil
}