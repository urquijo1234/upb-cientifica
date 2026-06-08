package grpc

import (
	"context"
	"fmt"
	"io"
	"log"
	"time"

	pb "github.com/urquijo1234/upb-cientifica/services/grpc-go/gen/go/filesync/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// FileSyncHandler implementa el servicio gRPC FileSyncService
type FileSyncHandler struct {
	pb.UnimplementedFileSyncServiceServer
}

// OpenSession — UNARY: el cliente se autentica
func (h *FileSyncHandler) OpenSession(
	ctx context.Context,
	req *pb.OpenSessionRequest,
) (*pb.OpenSessionResponse, error) {
	log.Printf("OpenSession: device=%s, platform=%s",
		req.DeviceId, req.Platform)

	// TODO: Validar JWT contra SOAP Server
	return &pb.OpenSessionResponse{
		SessionId:      fmt.Sprintf("sess_%d", time.Now().UnixMilli()),
		HomeRoot:       "/home/mock_user",
		QuotaBytesTotal: 5368709120, // 5 GB
		QuotaBytesUsed:  0,
		ConflictPolicy:  pb.ConflictPolicy_CONFLICT_KEEP_BOTH,
	}, nil
}

// ListRemoteManifest — SERVER STREAMING: envía la lista de archivos
func (h *FileSyncHandler) ListRemoteManifest(
	req *pb.ManifestRequest,
	stream pb.FileSyncService_ListRemoteManifestServer,
) error {
	log.Printf("ListRemoteManifest: session=%s, prefix=%s",
		req.SessionId, req.PathPrefix)

	// MOCK: Enviar algunos archivos de ejemplo
	files := []string{"documento.pdf", "datos/input.csv", "fotos/lab.jpg"}
	for i, f := range files {
		err := stream.Send(&pb.FileMeta{
			Path:      f,
			SizeBytes: int64((i + 1) * 1024),
			Sha256:    fmt.Sprintf("mock_hash_%d", i),
			ModifiedAt: timestamppb.Now(),
			Perms: &pb.PosixPermissions{
				Owner: "mock_user",
				Group: "investigadores",
				Mode:  0644,
			},
			IsDirectory: false,
		})
		if err != nil {
			return err
		}
	}
	return nil
}

// UploadFile — CLIENT STREAMING: recibe chunks de un archivo
func (h *FileSyncHandler) UploadFile(
	stream pb.FileSyncService_UploadFileServer,
) error {
	var totalBytes int64
	var filePath string

	for {
		chunk, err := stream.Recv()
		if err == io.EOF {
			log.Printf("UploadFile completo: %s (%d bytes)", filePath, totalBytes)
			return stream.SendAndClose(&pb.UploadAck{
				Accepted:    true,
				ServerPath:  filePath,
				BytesStored: totalBytes,
			})
		}
		if err != nil {
			return err
		}

		switch payload := chunk.Payload.(type) {
		case *pb.UploadChunk_Header:
			filePath = payload.Header.Path
			log.Printf("UploadFile inicio: %s", filePath)
		case *pb.UploadChunk_Chunk:
			totalBytes += int64(len(payload.Chunk.Data))
			// TODO: Escribir a disco
		}
	}
}

// DownloadFile — SERVER STREAMING: envía chunks de un archivo
func (h *FileSyncHandler) DownloadFile(
	req *pb.DownloadRequest,
	stream pb.FileSyncService_DownloadFileServer,
) error {
	log.Printf("DownloadFile: %s", req.Path)

	// MOCK: enviar datos falsos
	mockData := []byte("contenido mock del archivo para pruebas\n")
	return stream.Send(&pb.FileChunk{
		Data:      mockData,
		Offset:    0,
		LastChunk: true,
	})
}

// SyncStream — BIDIRECTIONAL: sincronización en tiempo real
func (h *FileSyncHandler) SyncStream(
	stream pb.FileSyncService_SyncStreamServer,
) error {
	for {
		event, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}

		log.Printf("SyncStream evento recibido: type=%s, path=%s",
			event.Type, event.Meta.GetPath())

		// MOCK: Eco — reenviar el evento con confirmación
		ack := &pb.SyncEvent{
			Type:           event.Type,
			Meta:           event.Meta,
			OriginDeviceId: "server",
			EmittedAt:      timestamppb.Now(),
		}
		if err := stream.Send(ack); err != nil {
			return err
		}
	}
}

// GetSyncStatus — UNARY: estado de la sincronización
func (h *FileSyncHandler) GetSyncStatus(
	ctx context.Context,
	req *pb.StatusRequest,
) (*pb.StatusResponse, error) {
	return &pb.StatusResponse{
		PendingUploads:   0,
		PendingDownloads: 0,
		LastSyncAt:       timestamppb.Now(),
		State:            "SYNCED",
	}, nil
}