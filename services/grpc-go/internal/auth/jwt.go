package auth

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"os"

	"github.com/golang-jwt/jwt/v5"
)

// JwtValidator valida JWTs RS256 firmados por el SOAP Server.
type JwtValidator struct {
	publicKey *rsa.PublicKey
}

// NewJwtValidator carga la clave pública desde un archivo PEM.
func NewJwtValidator(publicKeyPath string) (*JwtValidator, error) {
	keyData, err := os.ReadFile(publicKeyPath)
	if err != nil {
		return nil, fmt.Errorf("leer clave pública: %w", err)
	}

	block, _ := pem.Decode(keyData)
	if block == nil {
		return nil, errors.New("no se pudo decodificar PEM")
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parsear clave pública: %w", err)
	}

	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return nil, errors.New("la clave no es RSA")
	}

	return &JwtValidator{publicKey: rsaPub}, nil
}

// Claims es la estructura del payload del JWT.
type Claims struct {
	UID   string   `json:"sub"`
	DN    string   `json:"dn"`
	Email string   `json:"email"`
	Roles []string `json:"roles"`
	jwt.RegisteredClaims
}

// Validate verifica el JWT y retorna los claims si es válido.
func (v *JwtValidator) Validate(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		// Verificar que el algoritmo sea RS256
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("algoritmo inesperado: %v", t.Header["alg"])
		}
		return v.publicKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("validar JWT: %w", err)
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("claims inválidos")
}