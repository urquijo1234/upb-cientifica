package main

import (
	"fmt"
	"log"
	"net"
	"path/filepath"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	"github.com/urquijo1234/upb-cientifica/services/grpc-go/internal/auth"
	"github.com/urquijo1234/upb-cientifica/services/grpc-go/internal/storage"
	pb "github.com/urquijo1234/upb-cientifica/services/grpc-go/gen/go/filesync/v1"
	handler "github.com/urquijo1234/upb-cientifica/services/grpc-go/internal/transport/grpc"
)

func main() {
	port := 50051
	publicKeyPath, _ := filepath.Abs("../../infrastructure/keys/jwt_public.pem")
	validator, err := auth.NewJwtValidator(publicKeyPath)
	if err != nil {
		log.Fatalf("Error JWT: %v", err)
	}
	log.Println("JWT cargado")

	dataPath, _ := filepath.Abs("../../data/home")
	repo, err := storage.NewRepository(dataPath)
	if err != nil {
		log.Fatalf("Error repo: %v", err)
	}
	log.Printf("Repositorio: %s", dataPath)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		log.Fatalf("Listen: %v", err)
	}

	srv := grpc.NewServer(
		grpc.UnaryInterceptor(auth.UnaryInterceptor(validator)),
		grpc.StreamInterceptor(auth.StreamInterceptor(validator)),
	)
	pb.RegisterFileSyncServiceServer(srv, &handler.FileSyncHandler{Repo: repo, Validator: validator})
	reflection.Register(srv)

	log.Printf("gRPC :%d", port)
	srv.Serve(lis)
}