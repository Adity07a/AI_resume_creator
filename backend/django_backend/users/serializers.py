from django.contrib.auth import get_user_model
from rest_framework import serializers # type: ignore

User=get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password=serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type":"password"},
    )

    class Meta:
        model=User
        fields=[
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
        ]
        read_only_fields=["id"]

    def validate_email(self,value):
        return value.lower().strip()

    def create(self,validated_data):
        return User.objects.create_user(**validated_data)

    