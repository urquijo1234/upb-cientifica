package main

import (
	"fmt"
	"log"
	"net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	handler "github.com/urquijo1234/upb-cientifica/services/grpc-go/internal/transport/grpc"
	pb "github.com/urquijo1234/upb-cientifica/services/grpc-go/gen/go/filesync/v1"
)

func main() {
	port := 50051
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		log.Fatalf("Error al escuchar en puerto %d: %v", port, err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterFileSyncServiceServer(grpcServer, &handler.FileSyncHandler{})

	// Habilitar reflection (para probar con grpcurl)
	reflection.Register(grpcServer)

	log.Printf("gRPC Server escuchando en :%d", port)
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("Error al servir: %v", err)
	}
}