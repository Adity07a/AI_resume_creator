from django.shortcuts import render
from rest_framework import generics,permissions,status
from rest_framework.response import Response
from .serializers import UserRegistrationSerializer
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

