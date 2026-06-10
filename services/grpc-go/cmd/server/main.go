package main

import (
	"fmt"
	"log"
	"net"
	"path/filepath"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	"github.com/urquijo1234/upb-cientifica/services/grpc-go/internal/auth"
	pb "github.com/urquijo1234/upb-cientifica/services/grpc-go/gen/go/filesync/v1"
	handler "github.com/urquijo1234/upb-cientifica/services/grpc-go/internal/transport/grpc"
)

func main() {
	port := 50051

	// Cargar el validador JWT
	publicKeyPath, _ := filepath.Abs("../../infrastructure/keys/jwt_public.pem")
	validator, err := auth.NewJwtValidator(publicKeyPath)
	if err != nil {
		log.Fatalf("Error cargando clave pública: %v", err)
	}
	log.Println("Clave pública JWT cargada exitosamente")

	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		log.Fatalf("Error al escuchar en puerto %d: %v", port, err)
	}

	// Crear servidor gRPC con interceptores
	grpcServer := grpc.NewServer(
		grpc.UnaryInterceptor(auth.UnaryInterceptor(validator)),
		grpc.StreamInterceptor(auth.StreamInterceptor(validator)),
	)
	pb.RegisterFileSyncServiceServer(grpcServer, &handler.FileSyncHandler{})
	reflection.Register(grpcServer)

	log.Printf("gRPC Server escuchando en :%d", port)
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("Error al servir: %v", err)
	}
}