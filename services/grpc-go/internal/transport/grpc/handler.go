package grpc

import (
	"context"
	"fmt"
	"io"
	"log"
	"time"

	"github.com/urquijo1234/upb-cientifica/services/grpc-go/internal/auth"
	"github.com/urquijo1234/upb-cientifica/services/grpc-go/internal/storage"
	pb "github.com/urquijo1234/upb-cientifica/services/grpc-go/gen/go/filesync/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const chunkSize = 64 * 1024

type FileSyncHandler struct {
	pb.UnimplementedFileSyncServiceServer
	Repo      *storage.Repository
	Validator *auth.JwtValidator
}

func (h *FileSyncHandler) OpenSession(ctx context.Context, req *pb.OpenSessionRequest) (*pb.OpenSessionResponse, error) {
	claims, err := h.Validator.Validate(req.JwtToken)
	if err != nil {
		return nil, status.Errorf(codes.Unauthenticated, "JWT inválido: %v", err)
	}
	uid := claims.UID
	log.Printf("OpenSession: uid=%s, device=%s", uid, req.DeviceId)
	usedBytes, _ := h.Repo.UsedBytes(uid)
	return &pb.OpenSessionResponse{
		SessionId: fmt.Sprintf("sess_%s_%d", uid, time.Now().UnixMilli()),
		HomeRoot: "/home/" + uid, QuotaBytesTotal: 5368709120,
		QuotaBytesUsed: usedBytes, ConflictPolicy: pb.ConflictPolicy_CONFLICT_KEEP_BOTH,
	}, nil
}

func (h *FileSyncHandler) ListRemoteManifest(req *pb.ManifestRequest, stream pb.FileSyncService_ListRemoteManifestServer) error {
	claims, ok := auth.GetUser(stream.Context())
	if !ok {
		return status.Error(codes.Unauthenticated, "sin usuario")
	}
	files, err := h.Repo.ListFiles(claims.UID, req.PathPrefix)
	if err != nil {
		return status.Errorf(codes.Internal, "listar: %v", err)
	}
	for _, f := range files {
		stream.Send(&pb.FileMeta{
			Path: f.Path, SizeBytes: f.SizeBytes, Sha256: f.SHA256,
			ModifiedAt: &timestamppb.Timestamp{Seconds: f.ModifiedAt},
			Perms: &pb.PosixPermissions{Owner: f.Owner, Group: f.Group, Mode: f.Mode},
			IsDirectory: f.IsDirectory,
		})
	}
	return nil
}

func (h *FileSyncHandler) UploadFile(stream pb.FileSyncService_UploadFileServer) error {
	claims, ok := auth.GetUser(stream.Context())
	if !ok {
		return status.Error(codes.Unauthenticated, "sin usuario")
	}
	var filePath string
	var fileData []byte
	for {
		chunk, err := stream.Recv()
		if err == io.EOF {
			if writeErr := h.Repo.WriteFile(claims.UID, filePath, fileData); writeErr != nil {
				return stream.SendAndClose(&pb.UploadAck{Accepted: false, ErrorCode: writeErr.Error()})
			}
			log.Printf("Upload: %s/%s (%d bytes)", claims.UID, filePath, len(fileData))
			return stream.SendAndClose(&pb.UploadAck{Accepted: true, ServerPath: filePath, BytesStored: int64(len(fileData))})
		}
		if err != nil {
			return err
		}
		switch p := chunk.Payload.(type) {
		case *pb.UploadChunk_Header:
			filePath = p.Header.Path
			fileData = make([]byte, 0, p.Header.TotalSize)
		case *pb.UploadChunk_Chunk:
			fileData = append(fileData, p.Chunk.Data...)
		}
	}
}

func (h *FileSyncHandler) DownloadFile(req *pb.DownloadRequest, stream pb.FileSyncService_DownloadFileServer) error {
	claims, ok := auth.GetUser(stream.Context())
	if !ok {
		return status.Error(codes.Unauthenticated, "sin usuario")
	}
	return h.Repo.ReadFileChunked(claims.UID, req.Path, chunkSize, func(data []byte, offset int64, isLast bool) error {
		return stream.Send(&pb.FileChunk{Data: data, Offset: offset, LastChunk: isLast})
	})
}

func (h *FileSyncHandler) SyncStream(stream pb.FileSyncService_SyncStreamServer) error {
	claims, ok := auth.GetUser(stream.Context())
	if !ok {
		return status.Error(codes.Unauthenticated, "sin usuario")
	}
	for {
		event, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
		log.Printf("Sync [%s]: %s %s", claims.UID, event.Type, event.Meta.GetPath())
		stream.Send(&pb.SyncEvent{Type: event.Type, Meta: event.Meta, OriginDeviceId: "server", EmittedAt: timestamppb.Now()})
	}
}

func (h *FileSyncHandler) GetSyncStatus(ctx context.Context, req *pb.StatusRequest) (*pb.StatusResponse, error) {
	return &pb.StatusResponse{PendingUploads: 0, PendingDownloads: 0, LastSyncAt: timestamppb.Now(), State: "SYNCED"}, nil
}