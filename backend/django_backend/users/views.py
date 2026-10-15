from django.shortcuts import render
from rest_framework import generics,permissions,status
from rest_framework.response import Response
from .serializers import UserRegistrationSerializer
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
# Create your views here.

class RegisterView(generics.CreateAPIView):
    "Register a new user account"

    serializer_class =UserRegistrationSerializer
    permission_classes=[permissions.AllowAny]

    def create(self,request,*args,**kwargs):
        serializer=self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user=serializer.save()

        return Response(
            {
                "message":"Registration Successful",
                "user":{
                    "id":user.id,
                    "username":user.username,
                    "email":user.email,
                    "first_name":user.first_name,
                    "last_name":user.last_name,
                },
            },
            status=status.HTTP_201_CREATED,

        )



class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            },
            status=status.HTTP_200_OK,
        )
